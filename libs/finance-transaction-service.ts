import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  FinanceValidationError,
  MAX_MEMBER_FEE_PAISE,
  isCoreMemberCode,
  memberFiscalLabel,
  moneyToPaise,
  paiseToDecimal,
  validateSplits,
} from './finance-transactions';
import { toUTCDate } from './finance-utils';

export const transactionDetailsInclude = {
  partyMember: { select: { id: true, memberId: true } },
  splits: {
    orderBy: { position: 'asc' as const },
    include: {
      partyMember: { select: { id: true, memberId: true } },
      donationCredit: true,
    },
  },
  donationCredits: true,
} satisfies Prisma.TransactionInclude;

export type DetailedTransaction = Prisma.TransactionGetPayload<{
  include: typeof transactionDetailsInclude;
}>;

// Every finance mutation locks its statement first. An import/clear/edit/credit
// cannot race another mutation of the same bank entry. Transactions stay short.
export async function lockFinanceStatement(
  tx: Prisma.TransactionClient,
  statementId: string,
) {
  const found = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "MonthlyStatement" WHERE "id" = ${statementId} FOR UPDATE
  `);
  if (!found.length)
    throw new FinanceValidationError(
      'Monthly statement not found. Refresh and try again.',
    );
}

export function financeTransaction<T>(
  client: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return client.$transaction(run, { maxWait: 10_000, timeout: 20_000 });
}

function assertFresh(
  existing: DetailedTransaction,
  expectedUpdatedAt: unknown,
) {
  if (
    !expectedUpdatedAt ||
    new Date(String(expectedUpdatedAt)).getTime() !==
      existing.updatedAt.getTime()
  ) {
    throw new FinanceValidationError(
      'This transaction has changed. Refresh the page before continuing.',
    );
  }
}

function assertCreditedValuesUnchanged(
  existing: DetailedTransaction,
  next: {
    amount: string;
    type: string;
    txnDate: Date;
    partyName: string;
    partyMemberId: string | null;
  },
  splits: ReturnType<typeof validateSplits>,
) {
  if (!existing.donationCredits.length) return;
  if (
    moneyToPaise(existing.amount) !== moneyToPaise(next.amount) ||
    existing.type !== next.type ||
    existing.txnDate?.getTime() !== next.txnDate.getTime()
  ) {
    throw new FinanceValidationError(
      'Amount, type and date cannot change after a member donation has been credited.',
    );
  }
  if (existing.donationCredits.some((credit) => !credit.splitId)) {
    if (
      splits.length ||
      next.partyMemberId !== existing.partyMemberId ||
      next.partyName !== existing.partyName
    ) {
      throw new FinanceValidationError(
        'A credited transaction cannot be split or assigned to another party.',
      );
    }
  }
  for (const old of existing.splits) {
    if (!old.donationCredit) continue;
    const nextSplit = splits.find((split) => split.id === old.id);
    if (
      !nextSplit ||
      nextSplit.partyMemberId !== old.partyMemberId ||
      nextSplit.partyName !== old.partyName ||
      moneyToPaise(nextSplit.amount) !== moneyToPaise(old.amount)
    ) {
      throw new FinanceValidationError(
        'A credited sub-transaction cannot be removed or have its party or amount changed.',
      );
    }
  }
}

export async function saveFinanceTransaction(
  client: PrismaClient,
  input: Record<string, any>,
) {
  const statementId =
    typeof input.statementId === 'string' ? input.statementId : '';
  const id = typeof input.id === 'string' && input.id ? input.id : undefined;
  const amountPaise = moneyToPaise(input.amount);
  if (amountPaise <= 0)
    throw new FinanceValidationError('Amount must be greater than zero.');
  const balance = moneyToPaise(
    input.runningBalance ?? 0,
    'Running balance',
    true,
  );
  const txnDate = toUTCDate(input.txnDate);
  const valueDate = input.valueDate ? toUTCDate(input.valueDate) : null;
  if (
    !txnDate ||
    Number.isNaN(txnDate.getTime()) ||
    (input.valueDate && (!valueDate || Number.isNaN(valueDate.getTime())))
  ) {
    throw new FinanceValidationError(
      'A valid transaction date and value date are required.',
    );
  }
  if (input.type !== 'CREDIT' && input.type !== 'DEBIT')
    throw new FinanceValidationError('Invalid transaction type.');
  const splits = validateSplits(input.splits ?? [], input.amount);
  const next = {
    txnDate,
    valueDate,
    type: input.type as 'CREDIT' | 'DEBIT',
    amount: paiseToDecimal(amountPaise),
    runningBalance: paiseToDecimal(balance),
    description: String(input.description ?? ''),
    comment: String(input.comment ?? '').trim(),
    txnId: String(input.txnId ?? ''),
    refNo: String(input.refNo ?? ''),
    branchCode: String(input.branchCode ?? ''),
    partyName: String(input.partyName ?? '').trim(),
    reason: String(input.reason ?? '').trim(),
    partyMemberId:
      typeof input.partyMemberId === 'string' && input.partyMemberId
        ? input.partyMemberId
        : null,
  };
  if (
    next.partyName.length > 500 ||
    next.reason.length > 1000 ||
    next.comment.length > 4_000
  )
    throw new FinanceValidationError('Party, reason or comment is too long.');

  return financeTransaction(client, async (tx) => {
    await lockFinanceStatement(tx, statementId);
    const existing = id
      ? await tx.transaction.findUnique({
          where: { id },
          include: transactionDetailsInclude,
        })
      : null;
    if (id && (!existing || existing.statementId !== statementId))
      throw new FinanceValidationError(
        'Transaction not found in this statement.',
      );
    if (existing) assertFresh(existing, input.expectedUpdatedAt);
    // Date inputs only carry a calendar day. Preserve an existing timestamp
    // when that day did not change, including historical entries at midnight.
    if (
      existing?.txnDate?.toISOString().slice(0, 10) ===
      next.txnDate.toISOString().slice(0, 10)
    )
      next.txnDate = existing.txnDate;
    if (
      existing?.valueDate &&
      next.valueDate &&
      existing.valueDate.toISOString().slice(0, 10) ===
        next.valueDate.toISOString().slice(0, 10)
    )
      next.valueDate = existing.valueDate;

    // A member code (AM/FM/HM/LM...) belongs to Member.memberId, not User.id.
    // Never infer identity from a free-text party name or a client-supplied code.
    const memberIds = [
      ...new Set(
        [
          next.partyMemberId,
          ...splits.map((split) => split.partyMemberId),
        ].filter((v): v is string => !!v),
      ),
    ];
    const members = memberIds.length
      ? await tx.member.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, memberId: true },
        })
      : [];
    if (
      members.length !== memberIds.length ||
      members.some((member) => !isCoreMemberCode(member.memberId))
    ) {
      throw new FinanceValidationError(
        'Select a valid annual, life, honorary or founder member from the party search.',
      );
    }
    if (next.partyMemberId && !next.partyName)
      throw new FinanceValidationError('Member party name is required.');
    for (const split of splits) {
      if (split.id && !existing?.splits.some((old) => old.id === split.id)) {
        throw new FinanceValidationError(
          'A sub-transaction does not belong to this transaction. Refresh and try again.',
        );
      }
    }
    if (existing) assertCreditedValuesUnchanged(existing, next, splits);

    const transaction = existing
      ? await tx.transaction.update({ where: { id }, data: next })
      : await tx.transaction.create({ data: { ...next, statementId } });
    const keep = splits.flatMap((split) => (split.id ? [split.id] : []));
    if (existing) {
      await tx.transactionSplit.deleteMany({
        where: { transactionId: transaction.id, id: { notIn: keep } },
      });
    }
    const splitRows = splits.map((split, position) => ({ ...split, position }));
    const additions = splitRows
      .filter((split) => !split.id)
      .map(({ id: _id, ...split }) => ({
        ...split,
        transactionId: transaction.id,
      }));
    if (additions.length)
      await tx.transactionSplit.createMany({ data: additions });
    const updates = splitRows.filter((split) => !!split.id);
    if (updates.length) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "TransactionSplit" AS s SET
          "partyName" = v."partyName", "partyMemberId" = v."partyMemberId", "reason" = v."reason",
          "amount" = v."amount", "position" = v."position", "updatedAt" = NOW()
        FROM (VALUES ${Prisma.join(
          updates.map(
            (split) => Prisma.sql`(
          ${split.id}::text, ${split.partyName}::text, ${split.partyMemberId}::text,
          ${split.reason}::text, ${split.amount}::numeric, ${split.position}::integer
        )`,
          ),
        )}) AS v("id", "partyName", "partyMemberId", "reason", "amount", "position")
        WHERE s."id" = v."id" AND s."transactionId" = ${transaction.id}
      `);
    }
    return { id: transaction.id };
  });
}

export type DonationCreditInput = {
  transactionId: string;
  splitId?: string;
  fiscalLabel: string;
  expectedUpdatedAt: string;
  confirmed: boolean;
};

export async function creditFinanceDonation(
  client: PrismaClient,
  input: DonationCreditInput,
  actorId: string,
) {
  if (!input.confirmed)
    throw new FinanceValidationError(
      "Confirm this amount has not already been included in the member's yearly total.",
    );
  const match = /^(\d{4})-(\d{4})$/.exec(input.fiscalLabel ?? '');
  if (!match || Number(match[2]) !== Number(match[1]) + 1)
    throw new FinanceValidationError('Choose a valid financial year.');
  const entry = await client.transaction.findUnique({
    where: { id: input.transactionId },
    select: { statementId: true },
  });
  if (!entry) throw new FinanceValidationError('Transaction not found.');
  return financeTransaction(client, async (tx) => {
    await lockFinanceStatement(tx, entry.statementId);
    const transaction = await tx.transaction.findUnique({
      where: { id: input.transactionId },
      include: transactionDetailsInclude,
    });
    if (!transaction)
      throw new FinanceValidationError('Transaction not found.');
    const sourceKey = input.splitId
      ? `split:${input.splitId}`
      : `transaction:${transaction.id}`;
    const alreadyCredited = transaction.donationCredits.find(
      (credit) => credit.sourceKey === sourceKey,
    );
    if (alreadyCredited)
      return {
        alreadyCredited: true,
        fiscalLabel: alreadyCredited.fiscalLabel,
      };
    assertFresh(transaction, input.expectedUpdatedAt);
    if (transaction.type !== 'CREDIT')
      throw new FinanceValidationError(
        'Only income/credit transactions can be added to member donations.',
      );
    if (!input.splitId && transaction.splits.length)
      throw new FinanceValidationError(
        'Choose an individual sub-transaction instead of the parent total.',
      );
    const source = input.splitId
      ? transaction.splits.find((split) => split.id === input.splitId)
      : transaction;
    if (!source)
      throw new FinanceValidationError(
        'Sub-transaction not found in this transaction.',
      );
    if (!source.partyMemberId)
      throw new FinanceValidationError(
        'Select a member from the party search and save before adding a donation.',
      );
    // Lock the member while checking identity, including concurrent deletions.
    const [member] = await tx.$queryRaw<
      { id: string; memberId: string | null }[]
    >(Prisma.sql`
      SELECT "id", "memberId" FROM "Member" WHERE "id" = ${source.partyMemberId} FOR UPDATE
    `);
    if (!member || !isCoreMemberCode(member.memberId))
      throw new FinanceValidationError('This party is not an eligible member.');
    const amountPaise = moneyToPaise(source.amount);
    if (amountPaise <= 0 || amountPaise > MAX_MEMBER_FEE_PAISE)
      throw new FinanceValidationError(
        'Donation amount is outside the supported member total range.',
      );
    const availableYears = await tx.financialYear.findMany({
      select: { startDate: true },
    });
    const currentYear = new Date().getFullYear();
    const startYear = Number(match[1]);
    if (
      !(startYear >= 2020 && startYear <= currentYear) &&
      !availableYears.some(
        (year) => memberFiscalLabel(year.startDate) === input.fiscalLabel,
      )
    ) {
      throw new FinanceValidationError('This financial year is not available.');
    }
    if (!transaction.txnDate)
      throw new FinanceValidationError(
        'Set the transaction date before adding a donation.',
      );
    const currentFee = await tx.memberFee.findUnique({
      where: {
        memberId_fiscalLabel: {
          memberId: member.id,
          fiscalLabel: input.fiscalLabel,
        },
      },
    });
    if (
      moneyToPaise(currentFee?.amount ?? 0) + amountPaise >
      MAX_MEMBER_FEE_PAISE
    )
      throw new FinanceValidationError(
        "The member's yearly total would exceed the supported amount.",
      );
    const decimalAmount = paiseToDecimal(amountPaise);
    // Single atomic upsert handles NULL legacy amounts and concurrent increments
    // across different statements. Keep the existing paidOn date when present.
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "MemberFee" ("id", "memberId", "fiscalLabel", "paidOn", "amount", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${member.id}, ${input.fiscalLabel}, ${transaction.txnDate}, ${decimalAmount}::numeric, NOW(), NOW())
      ON CONFLICT ("memberId", "fiscalLabel") DO UPDATE SET
        "amount" = COALESCE("MemberFee"."amount", 0) + EXCLUDED."amount",
        "updatedAt" = NOW()
    `);
    await tx.financeDonationCredit.create({
      data: {
        sourceKey,
        transactionId: transaction.id,
        splitId: input.splitId || null,
        memberId: member.id,
        fiscalLabel: input.fiscalLabel,
        amount: decimalAmount,
        partyName: source.partyName ?? '',
        paidOn: transaction.txnDate,
        creditedById: actorId,
      },
    });
    await tx.$executeRaw(
      Prisma.sql`UPDATE "Member" SET "financeFeeRevision" = "financeFeeRevision" + 1 WHERE "id" = ${member.id}`,
    );
    return { alreadyCredited: false, fiscalLabel: input.fiscalLabel };
  });
}

// Member forms submit an entire yearly fee map. Lock/check this revision before
// their replacement logic, so an open form cannot erase a newly added credit.
export async function assertFinanceFeeRevision(
  tx: Prisma.TransactionClient,
  memberId: string,
  expected: unknown,
) {
  const rows = await tx.$queryRaw<{ financeFeeRevision: number }[]>(Prisma.sql`
    SELECT "financeFeeRevision" FROM "Member" WHERE "id" = ${memberId} FOR UPDATE
  `);
  if (!rows.length) throw new FinanceValidationError('Member not found.');
  if (rows[0].financeFeeRevision !== Number(expected ?? 0)) {
    throw new FinanceValidationError(
      'A donation was added to this member after you opened the form. Refresh the member list and reopen the form before saving.',
    );
  }
}

export async function removeFinanceTransactions(
  client: PrismaClient,
  statementId: string,
  transactionId?: string,
) {
  return financeTransaction(client, async (tx) => {
    await lockFinanceStatement(tx, statementId);
    const where = {
      statementId,
      ...(transactionId ? { id: transactionId } : {}),
    };
    const credited = await tx.financeDonationCredit.count({
      where: { transaction: where },
    });
    if (credited)
      throw new FinanceValidationError(
        'This transaction/statement includes credited member donations and cannot be deleted. Its donation audit must be preserved.',
      );
    await tx.transactionSplit.deleteMany({ where: { transaction: where } });
    await tx.transaction.deleteMany({ where });
    if (!transactionId)
      await tx.monthlyStatement.update({
        where: { id: statementId },
        data: { startBalance: 0, endBalance: 0, dataPopulatedDate: null },
      });
  });
}

// Re-imports retain party/reason/member links and stable split IDs. Reject any
// inconsistent bank changes before the statement or any transaction is written.
export async function mergeFinanceStatement(
  client: PrismaClient,
  statementId: string,
  statementData: Prisma.MonthlyStatementUpdateInput,
  rows: Prisma.TransactionCreateManyInput[],
) {
  return financeTransaction(client, async (tx) => {
    await lockFinanceStatement(tx, statementId);
    const existing = await tx.transaction.findMany({
      where: { statementId },
      include: transactionDetailsInclude,
    });
    const byTxnId = new Map<string, DetailedTransaction>();
    for (const row of existing)
      if (row.txnId && !byTxnId.has(row.txnId)) byTxnId.set(row.txnId, row);
    const updates = new Map<
      string,
      { previous: DetailedTransaction; next: Prisma.TransactionCreateManyInput }
    >();
    const newByTxnId = new Map<string, Prisma.TransactionCreateManyInput>();
    const withoutTxnId: Prisma.TransactionCreateManyInput[] = [];
    for (const row of rows) {
      const paise = moneyToPaise(row.amount);
      if (paise <= 0 || !row.txnDate || !row.type)
        throw new FinanceValidationError(
          'The statement contains an invalid transaction date or amount.',
        );
      moneyToPaise(row.runningBalance ?? 0, 'Running balance', true);
      const old = row.txnId ? byTxnId.get(row.txnId) : undefined;
      if (old) {
        if (old.splits.length && moneyToPaise(old.amount) !== paise) {
          throw new FinanceValidationError(
            `Transaction ${row.txnId} has a breakdown. Its bank amount changed; review the breakdown before importing.`,
          );
        }
        if (
          old.donationCredits.length &&
          (moneyToPaise(old.amount) !== paise ||
            old.type !== row.type ||
            old.txnDate?.getTime() !== new Date(row.txnDate).getTime())
        ) {
          throw new FinanceValidationError(
            `Transaction ${row.txnId} was credited to a member. Its amount, date or type cannot be changed by an import.`,
          );
        }
        updates.set(old.id, { previous: old, next: row });
      } else if (row.txnId) {
        newByTxnId.set(row.txnId, row);
      } else {
        withoutTxnId.push(row);
      }
    }
    // Batch bank updates and inserts to avoid one database round trip per row.
    const updateRows = [...updates.values()];
    for (let offset = 0; offset < updateRows.length; offset += 250) {
      const chunk = updateRows.slice(offset, offset + 250);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Transaction" AS t SET
          "txnDate" = v."txnDate", "valueDate" = v."valueDate",
          "amount" = v."amount", "runningBalance" = v."runningBalance",
          "description" = v."description", "updatedAt" = NOW()
        FROM (VALUES ${Prisma.join(
          chunk.map(
            ({ previous, next }) => Prisma.sql`(
          ${previous.id}::text, ${next.txnDate}::timestamp, ${next.valueDate ?? null}::timestamp,
          ${String(next.amount)}::numeric, ${String(next.runningBalance ?? 0)}::numeric,
          ${next.description ?? null}::text
        )`,
          ),
        )}) AS v("id", "txnDate", "valueDate", "amount", "runningBalance", "description")
        WHERE t."id" = v."id"
      `);
    }
    const additions = [...newByTxnId.values(), ...withoutTxnId];
    for (let offset = 0; offset < additions.length; offset += 250) {
      await tx.transaction.createMany({
        data: additions.slice(offset, offset + 250),
      });
    }
    await tx.monthlyStatement.update({
      where: { id: statementId },
      data: statementData,
    });
  });
}

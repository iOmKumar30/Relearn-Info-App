import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  assertFinanceFeeRevision,
  creditFinanceDonation,
  undoFinanceDonation,
  financeTransaction,
  mergeFinanceStatement,
  removeFinanceTransactions,
  saveFinanceTransaction,
  transactionDetailsInclude,
} from '../libs/finance-transaction-service';
import {
  isCoreMemberCode,
  moneyToPaise,
  paiseToDecimal,
  validateSplits,
  buildFinanceExpenseBreakdown,
  formatTransactionBreakdown,
} from '../libs/finance-transactions';

// This suite creates a disposable in-memory PostgreSQL instance. It never
// imports prismadb, loads .env, or uses DATABASE_URL/DIRECT_URL.
async function main() {
  assert.equal(
    moneyToPaise('0.10') + moneyToPaise('0.20'),
    moneyToPaise('0.30'),
  );
  assert.equal(
    paiseToDecimal(moneyToPaise('-123.45', 'Balance', true)),
    '-123.45',
  );
  for (const amount of ['NaN', 'Infinity', '1.001', '-1', '1e2', '', null])
    assert.throws(() => moneyToPaise(amount));
  for (const code of ['AM0001', 'LM35', 'HM0020', 'FM0003'])
    assert(isCoreMemberCode(code));
  assert(!isCoreMemberCode('IM001'));
  assert(!isCoreMemberCode('someone-AM001'));
  const split = (amount: string, memberId: string | null = 'member-AM') => ({
    partyName: 'Annual Member',
    partyMemberId: memberId,
    reason: 'Donation',
    amount,
  });
  assert.deepEqual(validateSplits([], '100'), []);
  assert.equal(
    validateSplits([split('0.10'), split('0.20')], '0.30').length,
    2,
  );
  assert.throws(
    () => validateSplits([split('49.99'), split('50')], '100'),
    /exactly/,
  );
  assert.throws(() => validateSplits([split('0')], '100'), /non-zero/);
  assert.throws(() => validateSplits([split('-0.00')], '100'), /non-zero/);
  assert.deepEqual(
    validateSplits([split('1000'), split('-20')], '980').map(
      (row) => row.amount,
    ),
    ['1000.00', '-20.00'],
  );
  assert.throws(
    () => validateSplits([split('1000'), split('-19.99')], '980'),
    /exactly/,
  );
  assert.throws(
    () => validateSplits([split('1000'), split('-20.001')], '980'),
    /two decimal/,
  );
  // Large opposing allocations must cancel exactly even beyond Number's
  // safe intermediate sum, while each individual amount remains valid.
  validateSplits(
    [
      ...Array.from({ length: 10 }, () => split('9999999999999.99')),
      ...Array.from({ length: 10 }, () => split('-9999999999999.99')),
      split('0.01'),
    ],
    '0.01',
  );
  assert.deepEqual(
    buildFinanceExpenseBreakdown([
      {
        type: 'CREDIT',
        amount: 980,
        reason: 'Payout',
        splits: [
          { amount: 1000, reason: 'Donation' },
          { amount: -20, reason: 'Razorpay charges' },
        ],
      },
      {
        type: 'DEBIT',
        amount: 100,
        splits: [
          { amount: 120, reason: 'Materials' },
          { amount: -20, reason: 'Materials' },
        ],
      },
      {
        type: 'DEBIT',
        amount: 0,
        splits: [{ amount: -5, reason: 'Refund only' }],
      },
    ]),
    [
      { name: 'Materials', value: 100 },
      { name: 'Razorpay charges', value: 20 },
    ],
  );

  const db = await PGlite.create();
  const server = new PGLiteSocketServer({
    db,
    port: 0,
    host: '127.0.0.1',
    maxConnections: 1,
  });
  let client: PrismaClient | undefined;
  try {
    // Minimum pre-upgrade schema. Historical rows are inserted BEFORE applying
    // the actual migration so data retention is tested, not just new behavior.
    await db.exec(`
      CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');
      CREATE TYPE "MemberType" AS ENUM ('ANNUAL', 'LIFE', 'HONORARY', 'FOUNDER', 'STUDENT', 'TUTOR', 'INTERN');
      CREATE TABLE "Member" ("id" TEXT PRIMARY KEY, "userId" TEXT UNIQUE, "memberId" TEXT UNIQUE);
      CREATE TABLE "MemberFee" ("id" TEXT PRIMARY KEY, "memberId" TEXT NOT NULL, "fiscalLabel" TEXT NOT NULL,
        "paidOn" TIMESTAMP(3) NOT NULL, "amount" DECIMAL(12,2), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("memberId", "fiscalLabel"));
      CREATE TABLE "FinancialYear" ("id" TEXT PRIMARY KEY, "startDate" TIMESTAMP(3) NOT NULL);
      CREATE TABLE "MonthlyStatement" ("id" TEXT PRIMARY KEY, "startBalance" DECIMAL(15,2), "endBalance" DECIMAL(15,2),
        "dataPopulatedDate" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "month" INTEGER NOT NULL DEFAULT 10, "year" INTEGER NOT NULL DEFAULT 2026,
        "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3), "statementFileUrl" TEXT,
        "financialYearId" TEXT NOT NULL DEFAULT 'year', "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE "Transaction" ("id" TEXT PRIMARY KEY, "statementId" TEXT NOT NULL, "txnDate" TIMESTAMP(3),
        "valueDate" TIMESTAMP(3), "type" "TransactionType" NOT NULL, "amount" DECIMAL(15,2),
        "runningBalance" DECIMAL(15,2), "partyName" TEXT, "reason" TEXT, "description" TEXT, "txnId" TEXT,
        "refNo" TEXT, "branchCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO "MonthlyStatement" ("id", "startBalance", "endBalance") VALUES ('statement', 250, 850), ('statement-2', 0, 0), ('empty-statement', 0, 0);
      INSERT INTO "FinancialYear" VALUES ('year', '2026-04-01');
      INSERT INTO "Transaction" ("id", "statementId", "type", "amount", "runningBalance", "partyName", "reason", "txnDate", "txnId")
        VALUES ('legacy', 'statement', 'CREDIT', 600, 850, 'Historical free-text name', 'Original reason', '2026-10-10 13:00:00', 'bank-1');
      INSERT INTO "MemberFee" VALUES ('legacy-fee', 'member-AM', '2026-2027', '2026-04-02', 1000, NOW(), NOW());
      INSERT INTO "Member" VALUES ('member-AM', 'user-AM', 'AM0001'), ('member-LM', 'user-LM', 'LM0001'),
        ('member-HM', 'user-HM', 'HM0001'), ('member-FM', 'user-FM', 'FM0001'), ('not-core', 'user-IM', 'IM0001');
    `);
    const beforeTransactions = (await db.query(`SELECT * FROM "Transaction"`))
      .rows;
    const beforeFees = (await db.query(`SELECT * FROM "MemberFee"`)).rows;
    const beforeBalances = (
      await db.query(`SELECT * FROM "MonthlyStatement" ORDER BY "id"`)
    ).rows;
    await db.exec(
      await readFile(
        new URL(
          '../prisma/migrations/20261019120000_add_finance_transaction_splits/migration.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          '../prisma/migrations/20261019121500_add_transaction_comment/migration.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          '../prisma/migrations/20261114120000_add_finance_donation_reversals/migration.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const migratedRows = (
      await db.query<Record<string, unknown>>(`SELECT * FROM "Transaction"`)
    ).rows;
    // The signed-amount migration must also preserve existing allocations.
    await db.exec(`INSERT INTO "TransactionSplit" ("id", "transactionId", "partyName", "reason", "amount", "position", "updatedAt")
      VALUES ('migration-split', 'legacy', 'Historic allocation', 'Original reason', 600, 0, NOW());`);
    const oldSplit = (
      await db.query(
        `SELECT * FROM "TransactionSplit" WHERE "id"='migration-split'`,
      )
    ).rows;
    await db.exec(
      await readFile(
        new URL(
          '../prisma/migrations/20261115120000_allow_signed_transaction_splits/migration.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    assert.deepEqual(
      (
        await db.query(
          `SELECT * FROM "TransactionSplit" WHERE "id"='migration-split'`,
        )
      ).rows,
      oldSplit,
    );
    await db.exec(
      `DELETE FROM "TransactionSplit" WHERE "id"='migration-split'`,
    );
    assert.deepEqual(
      migratedRows.map(({ partyMemberId, comment, ...rest }) => rest),
      beforeTransactions,
    );
    assert.equal(migratedRows[0].partyMemberId, null);
    assert.equal(migratedRows[0].comment, '');
    assert.deepEqual(
      (await db.query(`SELECT * FROM "MemberFee"`)).rows,
      beforeFees,
    );
    assert.deepEqual(
      (await db.query(`SELECT * FROM "MonthlyStatement" ORDER BY "id"`)).rows,
      beforeBalances,
    );

    await server.start();
    client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: `postgresql://postgres:postgres@${server.getServerConn()}/postgres`,
        max: 1,
      }),
    });
    const record = (id: string) =>
      client!.transaction.findUniqueOrThrow({
        where: { id },
        include: transactionDetailsInclude,
      });
    const payload = (
      row: Awaited<ReturnType<typeof record>>,
      changes = {},
    ) => ({
      ...row,
      txnDate: row.txnDate!.toISOString(),
      valueDate: row.valueDate?.toISOString() ?? '',
      amount: String(row.amount),
      runningBalance: String(row.runningBalance ?? 0),
      expectedUpdatedAt: row.updatedAt.toISOString(),
      splits: row.splits.map((item) => ({
        ...item,
        amount: String(item.amount),
      })),
      ...changes,
    });
    const credit = (
      row: Awaited<ReturnType<typeof record>>,
      splitId?: string,
      fiscalLabel = '2026-2027',
    ) =>
      record(row.id).then((latest) =>
        creditFinanceDonation(
          client!,
          {
            transactionId: row.id,
            splitId,
            fiscalLabel,
            expectedUpdatedAt: latest.updatedAt.toISOString(),
            confirmed: true,
          },
          'admin',
        ),
      );

    // Legacy entry gets a breakdown without changing the original bank row or total.
    let legacy = await record('legacy');
    await assert.rejects(
      saveFinanceTransaction(
        client,
        payload(legacy, { splits: [split('100')] }),
      ),
      /exactly/,
    );
    assert.equal((await record('legacy')).splits.length, 0);
    await saveFinanceTransaction(
      client,
      payload(legacy, {
        comment: 'Verified against October statement',
        splits: [
          split('200'),
          { ...split('400', 'member-LM'), partyName: 'Life Member' },
        ],
      }),
    );
    legacy = await record('legacy');
    assert.equal(legacy.splits.length, 2);
    assert.equal(String(legacy.amount), '600');
    assert.equal(legacy.comment, 'Verified against October statement');
    assert.equal(legacy.partyName, 'Historical free-text name');
    assert.equal(
      Number(
        (await client.transaction.aggregate({ _sum: { amount: true } }))._sum
          .amount,
      ),
      600,
    );
    await assert.rejects(credit(legacy), /individual sub-transaction/);
    await credit(legacy, legacy.splits[0].id);
    assert.equal(
      String(
        (
          await client.memberFee.findUniqueOrThrow({
            where: {
              memberId_fiscalLabel: {
                memberId: 'member-AM',
                fiscalLabel: '2026-2027',
              },
            },
          })
        ).amount,
      ),
      '1200',
    );
    assert.equal(
      (await credit(legacy, legacy.splits[0].id)).alreadyCredited,
      true,
    );
    assert.equal(
      (await credit(legacy, legacy.splits[0].id, '2025-2026')).alreadyCredited,
      true,
    );
    await assert.rejects(
      financeTransaction(client, (tx) =>
        assertFinanceFeeRevision(tx, 'member-AM', 0),
      ),
      /after you opened/,
    );
    await financeTransaction(client, (tx) =>
      assertFinanceFeeRevision(tx, 'member-AM', 1),
    );
    assert.equal(
      await client.memberFee.count({ where: { memberId: 'member-AM' } }),
      1,
    );
    await credit(legacy, legacy.splits[1].id);
    assert.equal(
      String(
        (
          await client.memberFee.findFirstOrThrow({
            where: { memberId: 'member-LM' },
          })
        ).amount,
      ),
      '400',
    );
    const originalPaidOn = (
      await client.memberFee.findFirstOrThrow({
        where: { memberId: 'member-AM' },
      })
    ).paidOn;
    assert.equal(originalPaidOn.toISOString().slice(0, 10), '2026-10-10');
    legacy = await record('legacy');
    await assert.rejects(
      saveFinanceTransaction(
        client,
        payload(legacy, {
          amount: '601',
          splits: [
            { ...split('201'), id: legacy.splits[0].id },
            { ...split('400', 'member-LM'), id: legacy.splits[1].id },
          ],
        }),
      ),
      /cannot change/,
    );
    await assert.rejects(
      saveFinanceTransaction(client, payload(legacy, { splits: [] })),
      /cannot be removed/,
    );
    await assert.rejects(
      removeFinanceTransactions(client, 'statement', 'legacy'),
      /cannot be deleted/,
    );
    await assert.rejects(
      removeFinanceTransactions(client, 'statement'),
      /cannot be deleted/,
    );
    assert.equal(await client.transaction.count(), 1);

    const bankRow: Prisma.TransactionCreateManyInput = {
      statementId: 'statement',
      txnId: 'bank-1',
      type: 'CREDIT',
      txnDate: legacy.txnDate,
      valueDate: null,
      amount: 600,
      runningBalance: 850,
      description: 'Re-imported',
    };
    await assert.rejects(
      mergeFinanceStatement(client, 'statement', { endBalance: 999 }, [
        { ...bankRow, amount: 601 },
      ]),
      /breakdown/,
    );
    assert.equal(
      Number(
        (
          await db.query<{ endBalance: string }>(
            `SELECT "endBalance" FROM "MonthlyStatement" WHERE "id"='statement'`,
          )
        ).rows[0].endBalance,
      ),
      850,
    );
    await mergeFinanceStatement(client, 'statement', { endBalance: 850 }, [
      bankRow,
    ]);
    assert.equal((await record('legacy')).splits.length, 2);
    assert.equal(await client.financeDonationCredit.count(), 2);
    assert.equal((await record('legacy')).description, 'Re-imported');
    assert.equal(
      (await record('legacy')).comment,
      'Verified against October statement',
    );
    // Batch split updates keep IDs (and their donation audit) stable.
    legacy = await record('legacy');
    await saveFinanceTransaction(
      client,
      payload(legacy, {
        splits: legacy.splits.map((item) => ({
          ...item,
          amount: String(item.amount),
          reason: 'Updated explanatory reason',
        })),
      }),
    );
    assert.deepEqual(
      (await record('legacy')).splits.map((item) => item.id),
      legacy.splits.map((item) => item.id),
    );
    assert(
      (await record('legacy')).splits.every(
        (item) => item.reason === 'Updated explanatory reason',
      ),
    );

    // All four member prefixes; simple sources, null legacy totals, cumulative amounts.
    for (const prefix of ['AM', 'LM', 'HM', 'FM']) {
      await saveFinanceTransaction(client, {
        statementId: 'statement-2',
        txnDate: '2026-10-11',
        amount: '25.15',
        runningBalance: 0,
        type: 'CREDIT',
        partyName: `${prefix} Member`,
        partyMemberId: `member-${prefix}`,
        reason: 'Donation',
        splits: [],
      });
      const simple = await client.transaction.findFirstOrThrow({
        where: {
          statementId: 'statement-2',
          partyMemberId: `member-${prefix}`,
        },
        include: transactionDetailsInclude,
      });
      if (prefix === 'HM')
        await client.memberFee.create({
          data: {
            memberId: 'member-HM',
            fiscalLabel: '2026-2027',
            amount: null,
            paidOn: new Date('2026-04-01'),
          },
        });
      const results = await Promise.all([credit(simple), credit(simple)]);
      assert.equal(
        results.filter((result) => !result.alreadyCredited).length,
        1,
      );
      const expected =
        prefix === 'AM' ? '1225.15' : prefix === 'LM' ? '425.15' : '25.15';
      assert.equal(
        String(
          (
            await client.memberFee.findFirstOrThrow({
              where: { memberId: `member-${prefix}` },
            })
          ).amount,
        ),
        expected,
      );
      const creditedSimple = await record(simple.id);
      await assert.rejects(
        saveFinanceTransaction(
          client,
          payload(creditedSimple, { splits: [split('25.15')] }),
        ),
        /cannot be split/,
      );
    }
    // Uncredited splits may be removed; all data is rolled back on invalid input.
    const fresh = await saveFinanceTransaction(client, {
      statementId: 'empty-statement',
      txnDate: '2026-10-12',
      amount: '100',
      type: 'DEBIT',
      runningBalance: '-100',
      splits: [split('100', null)],
    });
    let debit = await record(fresh.id);
    await assert.rejects(credit(debit, debit.splits[0].id), /Only income/);
    await assert.rejects(
      saveFinanceTransaction(
        client,
        payload(debit, { partyName: 'Fake', partyMemberId: 'not-core' }),
      ),
      /valid annual/,
    );
    await assert.rejects(
      saveFinanceTransaction(
        client,
        payload(debit, {
          splits: [{ ...split('100'), id: legacy.splits[0].id }],
        }),
      ),
      /does not belong/,
    );
    await saveFinanceTransaction(client, payload(debit, { splits: [] }));
    await assert.rejects(
      saveFinanceTransaction(client, payload(debit)),
      /has changed/,
    );
    debit = await record(fresh.id);
    assert.equal(debit.splits.length, 0);
    await removeFinanceTransactions(client, 'empty-statement');
    assert.equal(
      await client.transaction.count({
        where: { statementId: 'empty-statement' },
      }),
      0,
    );
    assert.equal(
      await client.transactionSplit.count({
        where: { transactionId: fresh.id },
      }),
      0,
    );
    // A failing audit write must roll back MemberFee and the revision as well.
    const rollback = await saveFinanceTransaction(client, {
      statementId: 'empty-statement',
      txnDate: '2026-10-13',
      amount: '10',
      type: 'CREDIT',
      partyName: 'Founder',
      partyMemberId: 'member-FM',
      runningBalance: 10,
      splits: [],
    });
    const rollbackRow = await record(rollback.id);
    await db.exec(`CREATE FUNCTION fail_test_credit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test audit failure'; END; $$;
      CREATE TRIGGER fail_test_credit BEFORE INSERT ON "FinanceDonationCredit" FOR EACH ROW EXECUTE FUNCTION fail_test_credit();`);
    await assert.rejects(credit(rollbackRow));
    assert.equal(
      String(
        (
          await client.memberFee.findFirstOrThrow({
            where: { memberId: 'member-FM' },
          })
        ).amount,
      ),
      '25.15',
    );
    await financeTransaction(client, (tx) =>
      assertFinanceFeeRevision(tx, 'member-FM', 1),
    );
    assert.equal(
      await client.financeDonationCredit.count({
        where: { transactionId: rollback.id },
      }),
      0,
    );
    await db.exec(
      `DROP TRIGGER fail_test_credit ON "FinanceDonationCredit"; DROP FUNCTION fail_test_credit();`,
    );

    // Undo targets the saved audit, never client-supplied amounts or members.
    legacy = await record('legacy');
    const originalCredit = legacy.donationCredits.find(
      (item) => item.splitId === legacy.splits[0].id,
    )!;
    const beforeUndoFee = await client.memberFee.findFirstOrThrow({
      where: { memberId: 'member-AM' },
    });
    const undoInput = {
      transactionId: legacy.id,
      creditId: originalCredit.id,
      confirmed: true,
    };
    await assert.rejects(
      undoFinanceDonation(client, { ...undoInput, confirmed: false }, 'admin'),
    );
    await client.memberFee.update({
      where: { id: beforeUndoFee.id },
      data: { amount: 1 },
    });
    await assert.rejects(
      undoFinanceDonation(client, undoInput, 'admin'),
      /reduced below/,
    );
    assert.equal(await client.financeDonationReversal.count(), 0);
    await client.memberFee.update({
      where: { id: beforeUndoFee.id },
      data: { amount: beforeUndoFee.amount },
    });

    // Failure to preserve the reversal audit rolls back the subtraction too.
    await db.exec(`CREATE FUNCTION fail_test_reversal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test reversal failure'; END; $$;
      CREATE TRIGGER fail_test_reversal BEFORE INSERT ON "FinanceDonationReversal" FOR EACH ROW EXECUTE FUNCTION fail_test_reversal();`);
    await assert.rejects(undoFinanceDonation(client, undoInput, 'admin'));
    assert.equal(
      String(
        (
          await client.memberFee.findUniqueOrThrow({
            where: { id: beforeUndoFee.id },
          })
        ).amount,
      ),
      String(beforeUndoFee.amount),
    );
    assert(
      await client.financeDonationCredit.findUnique({
        where: { id: originalCredit.id },
      }),
    );
    await db.exec(
      `DROP TRIGGER fail_test_reversal ON "FinanceDonationReversal"; DROP FUNCTION fail_test_reversal();`,
    );

    const undone = await Promise.all([
      undoFinanceDonation(client, undoInput, 'admin'),
      undoFinanceDonation(client, undoInput, 'another-admin'),
    ]);
    assert.equal(undone.filter((result) => !result.alreadyUndone).length, 1);
    const afterUndoFee = await client.memberFee.findUniqueOrThrow({
      where: { id: beforeUndoFee.id },
    });
    assert.equal(
      moneyToPaise(afterUndoFee.amount),
      moneyToPaise(beforeUndoFee.amount) - 20000,
    );
    assert.equal(
      afterUndoFee.paidOn.toISOString(),
      beforeUndoFee.paidOn.toISOString(),
    );
    const archived = await client.financeDonationReversal.findUniqueOrThrow({
      where: { creditId: originalCredit.id },
    });
    assert.equal(archived.memberId, originalCredit.memberId);
    assert.equal(String(archived.amount), '200');
    assert.equal(archived.creditedById, originalCredit.creditedById);
    await assert.rejects(
      financeTransaction(client, (tx) =>
        assertFinanceFeeRevision(tx, 'member-AM', 2),
      ),
      /after you opened/,
    );

    // A delayed original Add request must not re-credit a source just undone.
    await assert.rejects(
      creditFinanceDonation(
        client,
        {
          transactionId: legacy.id,
          splitId: originalCredit.splitId!,
          fiscalLabel: originalCredit.fiscalLabel,
          expectedUpdatedAt: legacy.updatedAt.toISOString(),
          confirmed: true,
        },
        'admin',
      ),
      /has changed/,
    );
    legacy = await record('legacy');
    await saveFinanceTransaction(
      client,
      payload(legacy, {
        splits: legacy.splits.map((item, index) => ({
          ...item,
          amount: String(item.amount),
          ...(index === 0
            ? { partyName: 'Honorary Member', partyMemberId: 'member-HM' }
            : {}),
        })),
      }),
    );
    legacy = await record('legacy');
    const corrected = await credit(legacy, legacy.splits[0].id, '2025-2026');
    const correctedCredit = corrected.status.credits.find(
      (item) => item.splitId === legacy.splits[0].id,
    )!;
    assert.notEqual(correctedCredit.id, originalCredit.id);
    await undoFinanceDonation(client, undoInput, 'admin'); // Old retry cannot undo the new credit.
    assert(
      await client.financeDonationCredit.findUnique({
        where: { id: correctedCredit.id },
      }),
    );
    await undoFinanceDonation(
      client,
      { ...undoInput, creditId: correctedCredit.id },
      'admin',
    );
    assert.equal(
      String(
        (
          await client.memberFee.findFirstOrThrow({
            where: { memberId: 'member-HM', fiscalLabel: '2025-2026' },
          })
        ).amount,
      ),
      '0',
    );
    assert.equal(await client.financeDonationReversal.count(), 2);

    // Backdated credits retain a newer paid-on date; parent Undo also works.
    const backdated = await saveFinanceTransaction(client, {
      statementId: 'empty-statement',
      txnDate: '2026-06-05',
      type: 'CREDIT',
      amount: '10',
      runningBalance: 10,
      partyMemberId: 'member-AM',
      partyName: 'Annual',
      splits: [],
    });
    const creditedBackdate = await credit(await record(backdated.id));
    assert.equal(
      (
        await client.memberFee.findUniqueOrThrow({
          where: { id: beforeUndoFee.id },
        })
      ).paidOn.toISOString(),
      beforeUndoFee.paidOn.toISOString(),
    );
    const parentCredit = creditedBackdate.status.credits[0];
    await undoFinanceDonation(
      client,
      {
        transactionId: backdated.id,
        creditId: parentCredit.id,
        confirmed: true,
      },
      'admin',
    );
    assert.equal(
      String(
        (
          await client.memberFee.findUniqueOrThrow({
            where: { id: beforeUndoFee.id },
          })
        ).amount,
      ),
      String(afterUndoFee.amount),
    );
    await removeFinanceTransactions(client, 'empty-statement', backdated.id);
    assert(
      await client.financeDonationReversal.findUnique({
        where: { creditId: parentCredit.id },
      }),
    );
    // Net payout: gross donation and withheld charge are signed allocations.
    const payout = await saveFinanceTransaction(client, {
      statementId: 'empty-statement',
      txnDate: '2026-10-15',
      type: 'CREDIT',
      amount: '980',
      runningBalance: 980,
      txnId: 'razorpay-payout',
      splits: [
        split('1000'),
        {
          ...split('-20', 'member-HM'),
          partyName: 'Razorpay',
          reason: 'Razorpay charges',
        },
      ],
    });
    let payoutRow = await record(payout.id);
    assert.equal(String(payoutRow.splits[1].amount), '-20');
    assert.match(formatTransactionBreakdown(payoutRow.splits), /-.*20\.00/);
    assert.equal(String(payoutRow.amount), '980');
    await assert.rejects(
      credit(payoutRow, payoutRow.splits[1].id),
      /Only positive/,
    );
    await assert.rejects(db.query(
      `INSERT INTO "TransactionSplit" ("id", "transactionId", "partyName", "reason", "amount", "position", "updatedAt") VALUES ('zero-test', $1, 'Zero', 'Invalid', 0, 2, NOW())`,
      [payout.id],
    ));
    const payoutFeeBefore = await client.memberFee.findFirstOrThrow({
      where: { memberId: 'member-AM', fiscalLabel: '2026-2027' },
    });
    const payoutCredit = await credit(payoutRow, payoutRow.splits[0].id);
    assert.equal(
      moneyToPaise(
        (
          await client.memberFee.findUniqueOrThrow({
            where: { id: payoutFeeBefore.id },
          })
        ).amount,
      ),
      moneyToPaise(payoutFeeBefore.amount) + 100000,
    );
    payoutRow = await record(payout.id);
    // Saving an unchanged credited payout, including its negative charge,
    // and re-importing its bank row must preserve both allocations and audit.
    await saveFinanceTransaction(client, payload(payoutRow));
    await mergeFinanceStatement(
      client,
      'empty-statement',
      { endBalance: 980 },
      [
        {
          statementId: 'empty-statement',
          txnId: 'razorpay-payout',
          type: 'CREDIT',
          amount: 980,
          runningBalance: 980,
          txnDate: payoutRow.txnDate,
        },
      ],
    );
    assert.equal(String((await record(payout.id)).splits[1].amount), '-20');
    await undoFinanceDonation(
      client,
      {
        transactionId: payout.id,
        creditId: payoutCredit.status.credits[0].id,
        confirmed: true,
      },
      'admin',
    );
    assert.equal(
      String(
        (
          await client.memberFee.findUniqueOrThrow({
            where: { id: payoutFeeBefore.id },
          })
        ).amount,
      ),
      String(payoutFeeBefore.amount),
    );
    console.log(
      'Finance verification passed: migration retention, exact totals, all four member types, cumulative and once-only credits, imports, stale edits and deletion protection. No external database was accessed.',
    );
  } finally {
    await client?.$disconnect();
    await server.stop();
    await db.close();
  }
}

main().catch((error) => {
  console.error('Finance verification failed', error);
  process.exitCode = 1;
});

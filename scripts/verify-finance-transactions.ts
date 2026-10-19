import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  assertFinanceFeeRevision,
  creditFinanceDonation,
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
  assert.throws(() => validateSplits([split('0')], '100'), /greater than zero/);

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
    const migratedRows = (
      await db.query<Record<string, unknown>>(`SELECT * FROM "Transaction"`)
    ).rows;
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
      creditFinanceDonation(
        client!,
        {
          transactionId: row.id,
          splitId,
          fiscalLabel,
          expectedUpdatedAt: row.updatedAt.toISOString(),
          confirmed: true,
        },
        'admin',
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
    assert.equal(originalPaidOn.toISOString().slice(0, 10), '2026-04-02');
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

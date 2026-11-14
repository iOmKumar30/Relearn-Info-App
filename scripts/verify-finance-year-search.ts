import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { buildFinanceYearSearchQuery } from '../libs/finance-year-search';

// Exercise the real PostgreSQL search against disposable data, without .env
// or a connection to the application database.
async function main() {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE TABLE "MonthlyStatement" ("id" text PRIMARY KEY, "financialYearId" text);
      CREATE TABLE "Transaction" ("id" text PRIMARY KEY, "statementId" text,
        "txnDate" timestamp, "partyName" text, "reason" text, "amount" decimal(15,2));
      CREATE TABLE "TransactionSplit" ("transactionId" text, "partyName" text,
        "reason" text, "amount" decimal(15,2));
      INSERT INTO "MonthlyStatement" VALUES ('april','year-one'), ('march','year-one'), ('other','year-two');
      INSERT INTO "Transaction" VALUES
        ('parent','april','2026-04-10','Relearn Foundation','General contribution',2500),
        ('later','march','2027-03-01','Guest','Training materials',100),
        ('other-year','other','2026-04-10','Relearn Foundation','Membership',1250.50),
        ('literal','april',NULL,'O''Brien 100%','A_B',10);
      INSERT INTO "TransactionSplit" VALUES
        ('parent','Annual Member','Membership',1250.50),
        ('parent','Another Member','Membership',1249.50);
      INSERT INTO "TransactionSplit" VALUES ('parent','Razorpay','Payout charges',-20);
    `);
    const search = async (query: string, page = 1, yearId = 'year-one') => {
      const sql = buildFinanceYearSearchQuery(yearId, query, page);
      return (await db.query<{ id: string }>(sql.text, sql.values)).rows.map(
        (row) => row.id,
      );
    };
    assert.deepEqual(await search('RELEARN'), ['parent']);
    assert.deepEqual(await search('materials'), ['later']);
    assert.deepEqual(await search('annual member'), ['parent']);
    assert.deepEqual(await search('-20'), ['parent']);
    assert.deepEqual(await search('Payout charges'), ['parent']);
    assert.deepEqual(await search('membership'), ['parent']);
    assert.deepEqual(await search('₹ 2,500.00'), ['parent']);
    assert.deepEqual(await search('1,250.50'), ['parent']);
    assert.deepEqual(await search('1,250.50', 1, 'year-two'), ['other-year']);
    assert.deepEqual(await search('missing'), []);
    assert.deepEqual(await search('%'), ['literal']);
    assert.deepEqual(await search('_'), ['literal']);
    assert.deepEqual(await search("O'Brien"), ['literal']);
    assert.deepEqual(await search("' OR TRUE --"), []);
    await db.exec(`INSERT INTO "Transaction"
      SELECT 'page-' || lpad(i::text, 2, '0'), 'april', '2026-04-01', 'Pagination', '', 1
      FROM generate_series(1, 25) AS i;`);
    const first = await search('Pagination');
    const second = await search('Pagination', 2);
    assert.equal(first.length, 21); // Extra row is the hasMore sentinel.
    assert.equal(second.length, 5);
    assert.deepEqual(first.slice(20), second.slice(0, 1));
    assert.equal(new Set([...first.slice(0, 20), ...second]).size, 25);
    console.log(
      'Year search passed: year isolation, parent/split matches, formatted amounts, literal input, unique parents and pagination. No external database accessed.',
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

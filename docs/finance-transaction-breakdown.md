# Finance transaction breakdown and member donation rollout

## Behavior

- A bank `Transaction` remains the original entry. It has zero or more `TransactionSplit` allocations with party, reason and amount (up to 100 per entry). If there are allocations, their positive amounts must equal the parent amount exactly, to the paise. One allocation is also supported.
- Editing a transaction provides an optional breakdown editor. The transaction list expands to show allocations, including their member codes and donation credit status.
- Every transaction also has an optional internal `Comment`. It is independent of the bank description, is preserved when a matching bank row is re-imported, and is included in monthly and yearly exports.
- Bank balances, transaction counts, income/expense totals and finance KPIs count parent entries only. Expense-category analytics use split reasons where present. Monthly/yearly exports include the breakdown in a separate column; child amounts do not appear as extra bank transactions.
- The party picker retains `Member.id`. The human-readable AM/FM/HM/LM code is `Member.memberId`; `User.id` is a UUID. Free-text names, interns and unselected search text never enable member donation credits. Existing names are not matched automatically because two people can share a name.
- For a saved CREDIT with no allocations, or an individual saved CREDIT allocation, “Add donation” opens a financial-year selector. This increments the existing `MemberFee.amount` for that member/year, treating a legacy null amount as zero. A new yearly record uses the bank transaction date. An existing record keeps its original payment date.
- Year labels use the member pages' existing `2026-2027` format. Options include the same dynamic years as member management and years configured in finance. No donation receipt is created by this action.
- A unique `FinanceDonationCredit` records the source, amount, member, year, bank payment date, actor and creation time. The fee update and audit are committed together. A source can be credited once in total, even if a retry specifies another financial year. Different transactions for the same member/year add cumulatively.
- The confirmation asks the operator to check whether older manual yearly totals already include this payment. Historical totals do not contain a source reference, so this cannot safely be inferred automatically.

## Protection after crediting

Credited source amounts and parties cannot be changed or removed. A credited simple parent cannot later be split, and the bank date/type/amount are protected if any allocation was credited. Description, reason and other non-financial metadata can still be edited. Transactions/months with credited sources cannot be deleted through finance; deleting a member referenced by a credit is restricted by the Prisma relation. There is no automatic reversal or transfer-to-another-year action in this change.

All finance mutations acquire the statement lock before writing. Donation actions also lock the member, check the saved source and verify the page's transaction version. Statement re-imports preserve allocations and party links; an amount/date/type conflict with credited data, or an amount conflict with a breakdown, aborts the entire import. Imports use batch writes, so they do not require a separate database round trip for each bank row. Existing handling of rows without a bank transaction ID is retained; re-importing those rows may add duplicate bank entries as before.

Each donation credit increments `Member.financeFeeRevision`. The four existing member edit forms send the revision they loaded; their APIs check it before replacing yearly fees. A stale open member form receives HTTP 409 and must be reopened after refreshing, so it cannot silently overwrite a newer finance credit. A deliberate member-fee edit made from a freshly loaded form retains the existing manual-edit behavior.

## Migration and historical data

Migrations: `20261019120000_add_finance_transaction_splits` and `20261019121500_add_transaction_comment`.

These are additive migrations, each wrapped in a database transaction. They add a nullable member link on `Transaction`, a zero-default revision on `Member`, two new tables/indexes, and a required `Transaction.comment` column with `""` as its default. PostgreSQL gives every historical transaction that blank comment without deleting or rewriting its financial data. The migrations do not update/delete bank transactions, monthly balances, existing member fees or donation receipts. Historical transactions retain their IDs, names, dates, amounts, running balances and statement links. They initially have no allocations and no credit audit. There is no destructive conversion or speculative backfill.

For an old transaction, edit it to add a breakdown or explicitly reselect its member from party search. Verify its amount was not previously included manually before using “Add donation”.

## Production rollout

1. Take a database backup and verify it can be restored to a separate test database. Keep all real payment activity paused during backup/reconciliation/migration/deployment.
2. Against the intended production database, run `npx prisma migrate status`. Review any _other_ pending migrations separately; `migrate deploy` applies every pending migration, not only this one.
3. Save the results of the reconciliation queries below. If possible, rehearse the migration and smoke checks on the restored test database first.
4. Deploy the schema **before activating the new application build**:

   ```sh
   npx prisma migrate deploy
   npx prisma generate
   ```

   Ensure this shell uses the intended database's `DIRECT_URL`. Generation also runs in the normal install/build scripts. Do not use `migrate reset` or `db push --accept-data-loss` for this rollout.

5. Deploy the app through the usual production pipeline. Keep the previous release available. The old release can still operate against the expanded schema if the new app needs to be rolled back; retain the added tables/columns and credit records. Avoid using old member-edit forms after finance credits have been enabled, because an old build does not check their revision.
6. Repeat reconciliation before entering new data. Original transaction counts/totals, monthly balances, member-fee counts/totals and receipt counts must match the saved results exactly. The new split and credit tables should be empty immediately after migration.
7. Complete the smoke checks below, then resume normal use. No production migration or financial-data write has been executed by the implementation/test process.

```sql
SELECT "statementId", "type", COUNT(*) AS entries,
       SUM("amount") AS amount, SUM("runningBalance") AS balances
FROM "Transaction" GROUP BY "statementId", "type" ORDER BY "statementId", "type";

SELECT "id", "startBalance", "endBalance"
FROM "MonthlyStatement" ORDER BY "id";

SELECT "fiscalLabel", COUNT(*) AS records, SUM("amount") AS amount
FROM "MemberFee" GROUP BY "fiscalLabel" ORDER BY "fiscalLabel";

SELECT COUNT(*) AS receipts, SUM("amount") AS amount FROM "donation";

-- Run only after migration:
SELECT COUNT(*) AS splits FROM "TransactionSplit";
SELECT COUNT(*) AS credits FROM "FinanceDonationCredit";
```

## Verification and smoke checks

The isolated regression suite uses Prisma, its PostgreSQL adapter and a disposable in-memory PGlite database (test dependencies supplied by Prisma's installed dev tooling). It does not load `.env` or access Neon:

```sh
npx tsx scripts/verify-finance-transactions.ts
npx prisma validate
npx tsc --noEmit --incremental false
```

It covers additive migration retention, exact decimal allocation, preservation of parent totals, all four member prefixes, cumulative and null fee totals, repeated/concurrent requests, year-change retries, credit rollback, stable allocation IDs, stale forms, import rejection and deletion protection. Embedded tests serialize database access; multi-connection load and Neon network latency still need staging verification.

On staging, test:

1. Open a historical month and compare its existing rows, totals and exports with the pre-upgrade version.
   Confirm its comments are blank, then save an internal comment and re-import the same bank row; the comment must remain unchanged and appear in both exports.
2. Save a valid two-part allocation, expand it, reload, and verify both parties/reasons/amounts remain. Try a one-paise mismatch, empty reason, zero/negative amount and a total over the parent; these must fail without a partial save.
3. Remove all uncredited allocations and verify the transaction returns to a simple entry without changing its bank amount.
4. Pick each AM/LM/HM/FM member explicitly; confirm free-text names, interns and DEBITs cannot be credited. Save, select a year, credit the exact amount, and check the member page's yearly total. Keep receipts separate.
5. Repeat the credit from two tabs and with a different year; verify there is only one credit record and only one increment. Credit a different source to the same member/year and verify cumulative addition.
6. Open a member edit form, credit that member in another tab, then save the older member form; verify it is rejected and the new amount survives.
7. Try changing a credited source's amount/member/date/type, deleting it, clearing its month, and importing a conflicting bank row; verify rejection with existing data intact. Re-import an unchanged bank row and verify its breakdown and audit survive.
8. Check mobile (320/375px), tablet and desktop: editor fields stack, lists expand, party selection works with keyboard, and the donation dialog scrolls with usable cancel/confirm controls.
9. Verify a non-admin cannot invoke any finance mutation or member lookup.

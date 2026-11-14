# Finance transaction breakdown and member donation rollout

## Behavior

- A bank `Transaction` remains the original entry. It has zero or more `TransactionSplit` allocations with party, reason and amount (up to 100 per entry). Allocations can be positive or negative but cannot be zero. Their signed sum must equal the positive parent amount exactly, to the paise. One allocation is also supported.
- Editing a transaction provides an optional breakdown editor. The transaction list expands to show allocations, including their member codes and donation credit status.
- Every transaction also has an optional internal `Comment`. It is independent of the bank description, is preserved when a matching bank row is re-imported, and is included in monthly and yearly exports.
- Bank balances, transaction counts, income/expense totals and finance KPIs count parent entries only. Expense-category analytics use split reasons where present. Monthly Excel exports replace compound parents with separate allocation rows. The yearly export keeps its existing breakdown-column format.
- For a net Razorpay credit of ₹980, use a gross donation allocation of ₹1,000 and a Razorpay charges allocation of −₹20. Use the settlement details to identify the actual gross donations and charges. Positive eligible allocations can be credited to members using their gross amount; negative allocations never enable Add donation. Do not additionally enter the same withheld fee as a separate bank debit.
- On CREDIT entries, negative allocations are deductions. On DEBIT entries, negative allocations offset the expense. Top Expenses includes withheld charges from credit payouts and nets debit allocations by reason, omitting zero/negative category totals because a pie chart cannot represent them. Cash-flow summaries/KPIs remain net bank movements, so the category chart is not a gross profit-and-loss statement and need not sum to the net bank-debit total.
- The party picker retains `Member.id`. The human-readable AM/FM/HM/LM code is `Member.memberId`; `User.id` is a UUID. Free-text names, interns and unselected search text never enable member donation credits. Existing names are not matched automatically because two people can share a name.
- For a saved CREDIT with no allocations, or an individual saved CREDIT allocation, “Add donation” opens a financial-year selector. This increments the existing `MemberFee.amount` for that member/year, treating a legacy null amount as zero. Paid-on becomes the later of the existing paid-on and bank transaction date, so a backdated credit cannot move it backwards. New yearly records use the bank transaction date. Saved sub-transactions offer Add/Undo both in the expanded list and in the unchanged edit form; save new or edited splits first.
- Year labels use the member pages' existing `2026-2027` format. Options include the same dynamic years as member management and years configured in finance. No donation receipt is created by this action.
- A unique active `FinanceDonationCredit` records the source, amount, member, year, bank payment date, actor and creation time. The fee update and audit are committed together. A source can have only one active credit, even if a retry specifies another financial year. Different transactions for the same member/year add cumulatively.
- The confirmation asks the operator to check whether older manual yearly totals already include this payment. Historical totals do not contain a source reference, so this cannot safely be inferred automatically.

## Protection after crediting

Credited source amounts and parties cannot be changed or removed while the credit is active. A credited simple parent cannot be split, and the bank date/type/amount are protected if any allocation has an active credit. Description, reason and other non-financial metadata can still be edited. Transactions/months with active credits cannot be deleted through finance; deleting a member referenced by an active credit is restricted by the Prisma relation.

## Undo and corrections

“Undo donation” shows the original member, amount and financial year for confirmation. The server reads those values from the saved credit ID, subtracts exactly that amount, leaves `MemberFee.paidOn` unchanged, archives the full original credit in `FinanceDonationReversal` with the reversing admin/time, and removes the active credit. All steps commit or roll back together. A zero balance is retained as a yearly fee row. Repeating the same undo does not subtract twice, including after a replacement credit has been created.

After undo, correct the source party or select a different year when adding again. Other active credits on the same bank entry remain protected. The reversal archive has no foreign keys to mutable/deletable source records, so later corrections or deletions cannot erase the financial history. An archive row preserves the original credit's member, party name, source IDs, amount, year, bank date, crediting admin/time and reversing admin/time.

Undo refuses if the yearly fee no longer exists or its current amount is smaller than the recorded credit. Reconcile manual fee edits before retrying; no automatic clamp or negative amount is applied. Manual fee totals do not describe individual payments, so the app cannot detect every prior manual adjustment or duplicate recording through another module. Confirm those totals before crediting or reversing. Automatic receipt synchronization must remain paused if finance is the authoritative manual-credit workflow.

Every Add/Undo advances the source transaction version and the member's finance revision. Old member forms are rejected after either change, and delayed pre-undo Add requests cannot credit the source again. Both actions use the same statement/member locking order.

All finance mutations acquire the statement lock before writing. Donation actions also lock the member, check the saved source and verify the page's transaction version. Statement re-imports preserve allocations and party links; an amount/date/type conflict with credited data, or an amount conflict with a breakdown, aborts the entire import. Imports use batch writes, so they do not require a separate database round trip for each bank row. Existing handling of rows without a bank transaction ID is retained; re-importing those rows may add duplicate bank entries as before.

Each donation credit or undo increments `Member.financeFeeRevision`. The four existing member edit forms send the revision they loaded; their APIs check it before replacing yearly fees. A stale open member form receives HTTP 409 and must be reopened after refreshing, so it cannot silently overwrite a newer finance credit or reversal. A deliberate member-fee edit made from a freshly loaded form retains the existing manual-edit behavior.

## Migration and historical data

Migrations: `20261019120000_add_finance_transaction_splits`, `20261019121500_add_transaction_comment`, `20261114120000_add_finance_donation_reversals`, and `20261115120000_allow_signed_transaction_splits`. The reversal migration only creates the archive table/indexes. The signed-allocation migration replaces the positive-only check with a non-zero check on `TransactionSplit`; it does not rewrite existing allocations. Existing member fees, paid-on dates and active credits remain unchanged. New date behavior applies to future Add actions only.

These are additive migrations, each wrapped in a database transaction. They add a nullable member link on `Transaction`, a zero-default revision on `Member`, split/active-credit/reversal tables and indexes, and a required `Transaction.comment` column with `""` as its default. PostgreSQL gives every historical transaction that blank comment without deleting or rewriting its financial data. The migrations do not update/delete bank transactions, monthly balances, existing member fees or donation receipts. Historical transactions retain their IDs, names, dates, amounts, running balances and statement links. On first installation they have no allocations or credit audit; upgrades retain all existing allocations and active credits. There is no destructive conversion or speculative backfill.

For an old transaction, edit it to add a breakdown or explicitly reselect its member from party search. Verify its amount was not previously included manually before using “Add donation”.

## Production rollout

### Monthly Excel export

Monthly exports are generated by the authenticated, admin-only
`GET /api/admin/finance/months/[statementId]/export` route. The export menu uses
`window.location.assign()` so no workbook library, Blob, or Excel byte buffer is
created in browser JavaScript. The server builds and returns the XLSX attachment,
using ExcelJS in the same manner as the KPI report exporter. No export-specific
migration is needed. The existing yearly exporter and app transaction views are
unchanged.

Simple transactions remain single rows. A compound parent is omitted and replaced
with its children, numbered `C7.1`, `C7.2` (or `D3.1`, etc.) in saved split order.
Every child inherits the parent's dates, description, comment, transaction ID,
reference, branch, type and running balance. Only amount, reason and party come
from the child. The redundant Sub-transactions column is absent.

The workbook retains true numeric amounts (including negative allocations),
sortable Excel dates, and text identifiers with leading zeros. It has a blue
header, alternating row fills, wrapped descriptions/comments, automatic filters,
frozen headings, and repeated print headings. Negative amounts display in red
parentheses. Summary figures retain the previous export's full-month bank-total
calculations and count each parent once. Parent balances repeat as references
on children and must not be summed. Type is inherited even on a negative offset.

“Current view (filtered)” applies the month search to saved parents and children.
All children of a matching parent are included, and parent numbering is assigned
before filtering. “All rows” ignores the search. Unsaved edits are not exported.
An inconsistent saved breakdown is rejected rather than silently exporting
amounts that do not reconcile. Download failures return a readable HTTP error;
as with the KPI download, they cannot be detected through a Blob-fetch progress
handler because the browser handles the attachment navigation.

Regression check: `npx tsx scripts/verify-monthly-finance-export.ts`. It creates
only synthetic in-memory workbooks and checks child-only rows, inherited fields,
serials, signed totals, filters, dates, styles, literal text and XLSX round-trip.
On staging, export an unsplit month, a month with signed splits, an empty month,
and filtered results matching only a child. Confirm the browser starts a direct
attachment download and that the app and yearly report still behave as before.

### Database migrations and deployment

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
6. Repeat reconciliation before entering new data. Original transaction counts/totals, monthly balances, member-fee counts/totals, active credits and receipt counts must match the saved results exactly. Split/credit tables should be empty only on first installation; on upgrades preserve their existing records. The new reversal archive starts empty.
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
SELECT COUNT(*) AS reversals FROM "FinanceDonationReversal";
```

## Verification and smoke checks

The financial-year page also provides a debounced search across that year's
parent transactions and sub-transactions by amount, party name and reason.
It queries only when text is entered, returns 20 parent results per page,
and uses uncached admin-only requests. Each result links to its transaction
in the month page. Search does not change yearly totals, month cards or exports.
No database migration is needed for year search.

Check a parent-only match, a split-only match (including a formatted amount such
as `1,250.50`), multiple splits matching the same parent, no results, pagination,
clearing the input, and quickly changing the query. Confirm that a transaction
from a different financial year is never returned and that non-admin requests
are denied. Search SQL regression: `npx tsx scripts/verify-finance-year-search.ts`.

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
2. Save a valid two-part allocation, expand it, reload, and verify both parties/reasons/amounts remain. Try a one-paise mismatch, empty reason, zero amount and a signed total unequal to the parent; these must fail without a partial save. A negative allocation is valid if the signed sum matches the parent.
3. Remove all uncredited allocations and verify the transaction returns to a simple entry without changing its bank amount.
4. Pick each AM/LM/HM/FM member explicitly; confirm free-text names, interns and DEBITs cannot be credited. Save, select a year, credit the exact amount, and check the member page's yearly total. Keep receipts separate.
5. Repeat the credit from two tabs and with a different year; verify there is only one credit record and only one increment. Credit a different source to the same member/year and verify cumulative addition.
6. Open a member edit form, credit that member in another tab, then save the older member form; verify it is rejected and the new amount survives.
7. Try changing a credited source's amount/member/date/type, deleting it, clearing its month, and importing a conflicting bank row; verify rejection with existing data intact. Re-import an unchanged bank row and verify its breakdown and audit survive.
8. Check mobile (320/375px), tablet and desktop: editor fields stack, lists expand, party selection works with keyboard, and the donation dialog scrolls with usable cancel/confirm controls.
9. Verify a non-admin cannot invoke any finance mutation or member lookup.
10. Add a parent donation and a split donation. Verify the paid-on date advances to a newer bank date and stays unchanged for an older bank date. Undo each and verify the exact amount is subtracted while paid-on remains unchanged. Repeat undo from two tabs and verify one subtraction and one reversal record per credit ID.
11. After undo, change the party/year and add again. Retry the old undo and verify it cannot undo the replacement credit. Check that old Add requests and member forms are rejected. Reduce/remove a fee manually on staging, then undo; verify it refuses without partial changes. Verify save-before-credit messaging for unsaved splits.
12. Save a ₹980 CREDIT with +₹1,000 donation and −₹20 Razorpay charges. Reload and search by the negative amount/charge reason; check monthly/yearly exports retain the minus sign. Confirm only the positive donation can be credited, its full ₹1,000 is added, and Undo subtracts exactly that ₹1,000. Re-import the unchanged net payout and verify the allocations survive. Top Expenses should include ₹20 in charges while income and bank balance remain ₹980.

To inspect reversals for reconciliation:

```sql
SELECT "creditId", "sourceKey", "memberId", "partyName", "fiscalLabel", "amount",
       "paidOn", "creditedById", "creditedAt", "reversedById", "reversedAt"
FROM "FinanceDonationReversal" ORDER BY "reversedAt" DESC;
```

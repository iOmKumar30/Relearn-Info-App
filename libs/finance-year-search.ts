import { Prisma } from '@prisma/client';

export const YEAR_SEARCH_PAGE_SIZE = 20;

// Literal substring matching mirrors the monthly search, including formatted
// currency input. EXISTS returns a parent once, even if several splits match.
export function buildFinanceYearSearchQuery(
  yearId: string,
  query: string,
  page: number,
) {
  const text = query.trim().toLowerCase();
  const amount = text.replace(/[\s,₹]/g, '');
  return Prisma.sql`
    SELECT t."id"
    FROM "Transaction" t
    JOIN "MonthlyStatement" m ON m."id" = t."statementId"
    WHERE m."financialYearId" = ${yearId}
      AND (
        strpos(lower(COALESCE(t."partyName", '')), ${text}) > 0
        OR strpos(lower(COALESCE(t."reason", '')), ${text}) > 0
        OR (${amount} <> '' AND strpos(COALESCE(t."amount"::text, ''), ${amount}) > 0)
        OR EXISTS (
          SELECT 1 FROM "TransactionSplit" s WHERE s."transactionId" = t."id"
            AND (
              strpos(lower(s."partyName"), ${text}) > 0
              OR strpos(lower(s."reason"), ${text}) > 0
              OR (${amount} <> '' AND strpos(s."amount"::text, ${amount}) > 0)
            )
        )
      )
    ORDER BY t."txnDate" DESC NULLS LAST, t."id" ASC
    LIMIT ${YEAR_SEARCH_PAGE_SIZE + 1} OFFSET ${(page - 1) * YEAR_SEARCH_PAGE_SIZE}
  `;
}

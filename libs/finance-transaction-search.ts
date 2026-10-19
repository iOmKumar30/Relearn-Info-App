type SearchableSplit = {
  amount?: unknown;
  partyName?: string | null;
  reason?: string | null;
};

export type SearchableFinanceTransaction = {
  amount?: unknown;
  partyName?: string | null;
  reason?: string | null;
  splits?: SearchableSplit[] | null;
};

function normalizedText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase();
}

function matchesAmount(amount: unknown, query: string): boolean {
  const compactQuery = query.replace(/[\s,₹]/g, '');
  if (!compactQuery) return false;

  const numericAmount = Number(amount);
  const values = [String(amount ?? '')];
  if (Number.isFinite(numericAmount)) {
    values.push(
      String(numericAmount),
      numericAmount.toFixed(2),
      new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
      }).format(numericAmount),
    );
  }

  return values.some((value) =>
    value
      .replace(/[\s,₹]/g, '')
      .toLocaleLowerCase()
      .includes(compactQuery),
  );
}

function matchesAllocation(
  allocation: Pick<
    SearchableFinanceTransaction,
    'amount' | 'partyName' | 'reason'
  >,
  query: string,
): boolean {
  return (
    normalizedText(allocation.partyName).includes(query) ||
    normalizedText(allocation.reason).includes(query) ||
    matchesAmount(allocation.amount, query)
  );
}

/**
 * Matches a parent bank transaction or any of its allocations. This is purely
 * a client-side view filter; it never changes the statement or its totals.
 */
export function matchesFinanceTransactionSearch(
  transaction: SearchableFinanceTransaction,
  rawQuery: string,
): boolean {
  const query = normalizedText(rawQuery);
  if (!query) return true;

  return (
    matchesAllocation(transaction, query) ||
    (transaction.splits ?? []).some((split) => matchesAllocation(split, query))
  );
}

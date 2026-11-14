'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/CrudControls/SearchBar';
import { useDebounce } from '@/app/hooks/useDebounce';
import { formatFinanceAmount } from '@/libs/finance-transactions';

type ResultRow = {
  id: string;
  statementId: string;
  txnDate: string | null;
  type: string;
  amount: string | null;
  partyName: string | null;
  reason: string | null;
  description: string | null;
  statement: { month: number; year: number };
  splits: { id: string; amount: string; partyName: string; reason: string }[];
};

export function YearTransactionSearch({ yearId }: { yearId: string }) {
  const [request, setRequest] = useState({ query: '', page: 1 });
  const debounced = useDebounce(request, 300);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([yearId, debounced.query.trim(), debounced.page]);
  const [result, setResult] = useState<{
    key: string;
    rows: ResultRow[];
    hasMore: boolean;
    error?: string;
  } | null>(null);
  const hasQuery = !!request.query.trim();
  const loading = hasQuery && (request !== debounced || result?.key !== key);

  useEffect(() => {
    if (!debounced.query.trim()) return;
    const controller = new AbortController();
    const url = `/api/admin/finance/${encodeURIComponent(yearId)}/transactions?${new URLSearchParams({ q: debounced.query.trim(), page: String(debounced.page) })}`;
    async function load() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok)
          throw new Error('Unable to search transactions. Please try again.');
        const data = await response.json();
        if (!controller.signal.aborted)
          setResult({ key, rows: data.rows, hasMore: data.hasMore });
      } catch {
        if (!controller.signal.aborted)
          setResult({
            key,
            rows: [],
            hasMore: false,
            error: 'Unable to search transactions. Please try again.',
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [debounced, key, yearId, retry]);

  return (
    <section
      aria-label="Search this year's transactions"
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        Search transactions across this year
      </h2>
      <div className="flex items-center gap-3">
        <SearchBar
          value={request.query}
          onChange={(query) =>
            setRequest({ query: query.slice(0, 200), page: 1 })
          }
          placeholder="Search amount, party name or reason…"
        />
        {hasQuery && (
          <button
            type="button"
            className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
            onClick={() => setRequest({ query: '', page: 1 })}
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Includes sub-transactions in every month. Totals and exports cover the
        full year.
      </p>
      {hasQuery && (
        <div className="mt-4" aria-busy={loading}>
          <p role="status" className="text-sm text-gray-500">
            {loading
              ? 'Searching…'
              : result?.error
                ? ''
                : result?.rows.length
                  ? `Page ${debounced.page} · ${result.rows.length} matching transactions`
                  : 'No matching transactions or sub-transactions.'}
          </p>
          {!loading && result?.error && (
            <div role="alert" className="text-sm text-red-700">
              {result.error}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setResult(null);
                  setRetry((value) => value + 1);
                }}
              >
                Retry
              </button>
            </div>
          )}
          {!loading &&
            !result?.error &&
            result?.rows.map((row) => (
              <article
                key={row.id}
                className="mt-3 min-w-0 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-gray-900">
                      {row.partyName || row.description || 'Bank transaction'}
                    </p>
                    <p className="break-words text-sm text-gray-600">
                      {row.reason || 'No reason recorded'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(
                        Date.UTC(
                          row.statement.year,
                          row.statement.month - 1,
                          1,
                        ),
                      ).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                      {row.txnDate
                        ? ` · ${new Date(row.txnDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })}`
                        : ''}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${row.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {row.type === 'CREDIT' ? '+' : '−'}{' '}
                    {row.amount === null
                      ? '—'
                      : formatFinanceAmount(row.amount)}
                  </p>
                </div>
                {row.splits.length > 0 && (
                  <details className="mt-3 rounded-lg bg-gray-50 p-3" open>
                    <summary className="cursor-pointer text-sm font-medium text-blue-700">
                      {row.splits.length} sub-transactions
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {row.splits.map((split) => (
                        <li
                          key={split.id}
                          className="flex flex-wrap justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 break-words">
                            {split.partyName} · {split.reason}
                          </span>
                          <span className="font-medium">
                            {formatFinanceAmount(split.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <Link
                  prefetch={false}
                  href={`/admin/finance/${yearId}/month/${row.statementId}#transaction-${row.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline"
                >
                  Open in month →
                </Link>
              </article>
            ))}
          {!loading &&
            !result?.error &&
            (debounced.page > 1 || result?.hasMore) && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={debounced.page === 1}
                  onClick={() =>
                    setRequest({ ...request, page: debounced.page - 1 })
                  }
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {debounced.page}
                </span>
                <button
                  type="button"
                  disabled={!result?.hasMore}
                  onClick={() =>
                    setRequest({ ...request, page: debounced.page + 1 })
                  }
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
        </div>
      )}
    </section>
  );
}

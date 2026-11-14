import { matchesFinanceTransactionSearch } from '../finance-transaction-search';
import { moneyToPaise } from '../finance-transactions';

export type MonthlyExportTransaction = {
  id: string;
  txnDate: Date | null;
  valueDate: Date | null;
  description: string | null;
  comment: string;
  txnId: string | null;
  refNo: string | null;
  branchCode: string | null;
  type: 'CREDIT' | 'DEBIT';
  amount: unknown;
  runningBalance: unknown;
  reason: string | null;
  partyName: string | null;
  splits: { amount: unknown; reason: string; partyName: string }[];
};

export type MonthlyExportRow = {
  serialNo: string;
  txnDate: Date | null;
  valueDate: Date | null;
  description: string;
  comment: string;
  txnId: string;
  refNo: string;
  branchCode: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number | null;
  runningBalance: number | null;
  reason: string;
  partyName: string;
};

function numeric(value: unknown): number | null {
  return value == null
    ? null
    : moneyToPaise(value, 'Export amount', true) / 100;
}

export function buildMonthlyFinanceExport(
  transactions: MonthlyExportTransaction[],
  query = '',
) {
  let creditCount = 0;
  let debitCount = 0;
  let creditPaise = BigInt(0);
  let debitPaise = BigInt(0);
  let matchedParents = 0;
  const rows: MonthlyExportRow[] = [];

  for (const transaction of transactions) {
    const isCredit = transaction.type === 'CREDIT';
    const serialNo = isCredit ? `C${++creditCount}` : `D${++debitCount}`;
    const parentPaise = BigInt(moneyToPaise(transaction.amount ?? 0));
    if (isCredit) creditPaise += parentPaise;
    else debitPaise += parentPaise;
    if (!matchesFinanceTransactionSearch(transaction, query)) continue;
    matchedParents++;
    const inherited = {
      txnDate: transaction.txnDate,
      valueDate: transaction.valueDate,
      description: transaction.description ?? '',
      comment: transaction.comment ?? '',
      txnId: transaction.txnId ?? '',
      refNo: transaction.refNo ?? '',
      branchCode: transaction.branchCode ?? '',
      type: transaction.type,
      runningBalance: numeric(transaction.runningBalance),
    };
    if (transaction.splits.length) {
      const signedSum = transaction.splits.reduce(
        (sum, split) =>
          sum +
          BigInt(moneyToPaise(split.amount, 'Sub-transaction amount', true)),
        BigInt(0),
      );
      if (signedSum !== parentPaise)
        throw new Error(
          `Transaction ${transaction.id} has an inconsistent breakdown. Reconcile it before exporting.`,
        );
      transaction.splits.forEach((split, index) =>
        rows.push({
          ...inherited,
          serialNo: `${serialNo}.${index + 1}`,
          amount: numeric(split.amount),
          reason: split.reason,
          partyName: split.partyName,
        }),
      );
    } else {
      rows.push({
        ...inherited,
        serialNo,
        amount: numeric(transaction.amount),
        reason: transaction.reason ?? '',
        partyName: transaction.partyName ?? '',
      });
    }
  }
  // Preserve the previous monthly export's summary calculations. Allocations
  // never contribute a second time, and filtering never changes bank totals.
  const closingPaise = BigInt(
    moneyToPaise(
      transactions.at(-1)?.runningBalance ?? 0,
      'Closing balance',
      true,
    ),
  );
  return {
    rows,
    matchedParents,
    parentCount: transactions.length,
    summary: {
      openingBalance: Number(closingPaise - creditPaise + debitPaise) / 100,
      closingBalance: Number(closingPaise) / 100,
      totalIncome: Number(creditPaise) / 100,
      totalExpense: Number(debitPaise) / 100,
    },
  };
}

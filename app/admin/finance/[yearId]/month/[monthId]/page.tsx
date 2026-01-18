import { getMonthDetails } from "@/app/actions/finance";
import { ClearDataButton } from "@/components/finance/clear-button";
import { EditableBalances } from "@/components/finance/editable-balance";
import { TransactionManager } from "@/components/finance/transaction-manager";
import { UploadStatementButton } from "@/components/finance/upload-button";
import { Prisma } from "@prisma/client";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type MonthlyStatementWithDetails = Prisma.MonthlyStatementGetPayload<{
  include: {
    financialYear: true;
    transactions: {
      orderBy: { txnDate: "asc" };
    };
  };
}>;

export default async function MonthDetailPage({
  params,
}: {
  params: Promise<{ yearId: string; monthId: string }>;
}) {
  const { monthId, yearId } = await params;

  const statement = (await getMonthDetails(
    monthId
  )) as unknown as MonthlyStatementWithDetails | null;

  if (!statement) return notFound();

  const serializedTransactions = statement.transactions.map((txn) => ({
    ...txn,
    amount: Number(txn.amount),
    runningBalance: Number(txn.runningBalance),
  }));

  const totalIncome = serializedTransactions
    .filter((t) => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = serializedTransactions
    .filter((t) => t.type === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthName = new Date(0, statement.month - 1).toLocaleString("default", {
    month: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/admin/finance/${yearId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to{" "}
            {statement.financialYear.name}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {monthName} {statement.year}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {statement.startDate
                ? new Date(statement.startDate).toLocaleDateString()
                : "Date not set"}
              {" - "}
              {statement.endDate
                ? new Date(statement.endDate).toLocaleDateString()
                : "Date not set"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <ClearDataButton
            monthId={statement.id}
            hasData={serializedTransactions.length > 0}
          />
          <UploadStatementButton monthId={statement.id} isLocked={false} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditableBalances
            statementId={statement.id}
            initialStartBalance={Number(statement.startBalance)}
            initialEndBalance={Number(statement.endBalance)}
          />
        </div>

        <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <TrendingUp className="w-16 h-16 text-green-600" />
          </div>
          <p className="text-xs font-bold text-green-600 uppercase flex items-center gap-1 relative z-10">
            Total Income
          </p>
          <p className="text-2xl font-mono font-bold text-green-700 mt-1 relative z-10">
            +
            {Number(totalIncome).toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <TrendingDown className="w-16 h-16 text-red-600" />
          </div>
          <p className="text-xs font-bold text-red-600 uppercase flex items-center gap-1 relative z-10">
            Total Expenses
          </p>
          <p className="text-2xl font-mono font-bold text-red-700 mt-1 relative z-10">
            -
            {Number(totalExpense).toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-semibold uppercase">
              Transactions
            </p>
            <div className="h-6 w-6 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {statement.transactions.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TransactionManager
          transactions={serializedTransactions}
          statementId={statement.id}
        />
      </div>
    </div>
  );
}

import {
  getFinancialYearDetails,
  getYearlyAnalytics,
} from "@/app/actions/finance";
import { AnalyticsDashboard } from "@/components/finance/analytics-dashboard";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Helper to format currency
const formatCurrency = (amount: any) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

// Helper to get Month Name
const getMonthName = (monthNumber: number) => {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString("default", { month: "long" });
};

export default async function FinancialYearDetail({
  params,
}: {
  params: Promise<{ yearId: string }>;
}) {
  const { yearId } = await params;

  // Fetch data in parallel
  const [detailsRes, analyticsRes] = await Promise.all([
    getFinancialYearDetails(yearId),
    getYearlyAnalytics(yearId),
  ]);

  const year = detailsRes.data;
  const analytics = analyticsRes.data;

  if (!detailsRes.success || !year) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 space-y-8">
      {analytics && <AnalyticsDashboard data={analytics} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/finance"
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Financial Years
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {year.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(year.startDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              —{" "}
              {new Date(year.endDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="bg-white px-6 py-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </p>
            <p
              className={`text-sm font-bold px-2 py-0.5 rounded-full inline-block ${
                year.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {year.isActive ? "Active Year" : "Archived"}
            </p>
          </div>
        </div>
      </div>

      {/* Month Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {year.months.map((statement: any) => {
          return (
            <div
              key={statement.id}
              className="group relative flex flex-col justify-between rounded-2xl border bg-white border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {getMonthName(statement.month)}
                    </h3>
                    <p className="text-sm font-medium text-gray-400">
                      {statement.year}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <TrendingDown className="w-3.5 h-3.5" />
                      OPENING
                    </div>
                    <span className="font-mono text-sm font-semibold text-gray-700">
                      {formatCurrency(statement.startBalance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      CLOSING
                    </div>
                    <span className="font-mono text-sm font-bold text-blue-700">
                      {formatCurrency(statement.endBalance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 mt-2 border-t border-gray-100">
                <Link
                  href={`/admin/finance/${year.id}/month/${statement.id}`}
                  className="flex items-center justify-center w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 shadow-md hover:shadow-lg"
                >
                  Manage Transactions
                </Link>

                <div className="mt-2 text-center">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {statement._count?.transactions || 0} transactions recorded
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {year.months.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 text-center">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Months Found</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2">
            Something went wrong generating the months for this fiscal year.
            Please try refreshing the page.
          </p>
        </div>
      )}
    </div>
  );
}

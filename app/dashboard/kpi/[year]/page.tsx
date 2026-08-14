"use client";

import { cn } from "@/libs/kpi/utils";
import { currentMonthYYYYMM } from "@/libs/kpi/month";
import { ArrowLeft, Calendar, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ESSENTIAL_TREND_KPIS = [
  { key: "students.total", label: "Total Active Students", color: "#2563eb" },
  { key: "classrooms.total", label: "Total Active Classrooms", color: "#16a34a" },
  { key: "tutors.total", label: "Total Active Tutors", color: "#9333ea" },
  { key: "members.total", label: "Total Core Members", color: "#ea580c" },
  { key: "persons.trained", label: "Number of Interns", color: "#db2777" },
] as const;

type RangeKpi = {
  key: string;
  series: Array<{ month: string; value: number | null }>;
};

function formatValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "—";
  if (unit === "PERCENT") return `${(value * 100).toFixed(1)}%`;
  if (unit === "LAKHS") return `₹${value.toFixed(2)}L`;
  return value.toLocaleString("en-IN");
}

function formatMonthLabel(month: string | null): string | null {
  if (!month) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTHS[monthNumber - 1]} ${year}`;
}

type SummaryKpi = {
  id: string;
  key: string;
  label: string;
  unit: string;
  category: string | null;
  sortOrder: number;
  aggregatedValue: number | null;
  monthsCovered: number;
  latestAvailableMonth: string | null;
  fiscalLabel: string | null;
  historicalAvailability: "MANUAL_ENTRY_REQUIRED" | "HISTORICAL_DATA_UNAVAILABLE" | null;
};

type SummaryData = {
  year: number;
  monthsWithData: number;
  isFullYear: boolean;
  fiscalLabel: string;
  isCurrentYear: boolean;
  latestCompletedMonth: string | null;
  kpis: SummaryKpi[];
};

// Month has data if it has at least one KPIMonthlyValue record
type MonthStatus = { month: number; hasData: boolean };

export default function KpiYearPage() {
  const { year } = useParams<{ year: string }>();
  const router = useRouter();
  const yearNum = Number(year);

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [monthStatuses, setMonthStatuses] = useState<MonthStatus[]>([]);
  const [rangeKpis, setRangeKpis] = useState<RangeKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [summaryRes, monthRes] = await Promise.all([
          fetch(`/api/kpi/years/${year}/summary`, { cache: "no-store" }),
          fetch(`/api/kpi/range?from=${year}-01&to=${year}-12`, {
            cache: "no-store",
          }),
        ]);

        if (!summaryRes.ok) throw new Error("Failed to load summary");
        const summaryJson = await summaryRes.json();
        setSummary(summaryJson);

        if (monthRes.ok) {
          const rangeJson = await monthRes.json();
          setRangeKpis(rangeJson.kpis || []);
          // Determine which months have at least one non-null value across all KPIs
          const statuses: MonthStatus[] = Array.from({ length: 12 }, (_, i) => {
            const monthIdx = i; // 0-based
            const hasData = (rangeJson.kpis || []).some((k: any) =>
              k.series?.[monthIdx]?.value !== null,
            );
            return { month: i + 1, hasData };
          });
          setMonthStatuses(statuses);
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load year data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year]);

  const [currentYear, currentMonth] = currentMonthYYYYMM().split("-").map(Number);

  const annualTrendData = useMemo(() => {
    const kpisByKey = new Map(rangeKpis.map((kpi) => [kpi.key, kpi]));
    return MONTHS.map((monthLabel, index) => {
      const point: Record<string, string | number | null> = {
        month: monthLabel.slice(0, 3),
      };
      const isCurrentYearInProgressMonth = yearNum === currentYear && index + 1 >= currentMonth;
      for (const kpi of ESSENTIAL_TREND_KPIS) {
        point[kpi.key] = isCurrentYearInProgressMonth
          ? null
          : kpisByKey.get(kpi.key)?.series[index]?.value ?? null;
      }
      return point;
    });
  }, [currentMonth, currentYear, rangeKpis, yearNum]);

  const hasAnnualTrendData = annualTrendData.some((point) =>
    ESSENTIAL_TREND_KPIS.some((kpi) => point[kpi.key] !== null),
  );

  // Group summary KPIs by category
  const groups = new Map<string, SummaryKpi[]>();
  if (summary) {
    for (const k of summary.kpis) {
      const cat = k.category || "General";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(k);
    }
    for (const arr of groups.values())
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
              href="/dashboard/kpi/historical"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Years
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">{year}</h1>
              {summary && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    summary.isFullYear
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {summary.isFullYear ? "Full Year" : "Year to Date"}
                </span>
              )}
            </div>
            {summary && (
              <p className="text-sm text-gray-500">
                {summary.monthsWithData} of 12 months have data ·{" "}
                {summary.fiscalLabel} for finance KPIs
              </p>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <ClipLoader size={36} />
        </div>
      ) : (
        <>
          {/* Year Summary KPI Cards */}
          {summary && (
            <div className="space-y-6">
              {Array.from(groups.entries()).map(([cat, kpis]) => (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      {cat}
                      {cat === "Finance" && (
                        <span className="ml-2 font-normal normal-case text-gray-400">
                          ({summary.fiscalLabel})
                        </span>
                      )}
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {kpis.map((k) => (
                      <div
                        key={k.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-xs text-gray-500 truncate">
                          {k.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                          {formatValue(k.aggregatedValue, k.unit)}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {k.historicalAvailability === "MANUAL_ENTRY_REQUIRED"
                            ? "Manual entry required"
                            : k.historicalAvailability === "HISTORICAL_DATA_UNAVAILABLE"
                              ? "Historical data unavailable"
                            : k.aggregatedValue === null
                              ? "No snapshot"
                              : k.unit === "PERCENT"
                                ? summary.isCurrentYear
                                  ? "Average across completed months"
                                  : `Average across ${k.monthsCovered} months`
                                : summary.isCurrentYear
                                  ? `Latest completed month: ${formatMonthLabel(summary.latestCompletedMonth)}`
                                  : `Latest available month: ${formatMonthLabel(k.latestAvailableMonth)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Essential KPI Trends */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Essential KPI Trends
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Monthly progress for the selected calendar year. Missing snapshots appear as gaps.
              </p>
            </div>
            {hasAnnualTrendData ? (
              <div className="mt-5 h-80 min-w-0" role="img" aria-label={`Essential KPI trends for ${year}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={annualTrendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value, name) => [Number(value).toLocaleString("en-IN"), String(name)]}
                      labelFormatter={(label) => `${label} ${year}`}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    {ESSENTIAL_TREND_KPIS.map((kpi) => (
                      <Line
                        key={kpi.key}
                        type="monotone"
                        dataKey={kpi.key}
                        name={kpi.label}
                        stroke={kpi.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-gray-500">
                No snapshots are available for the essential KPI trend.
              </p>
            )}
          </section>

          {/* 12 Month Tiles */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Monthly Breakdown
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {MONTHS.map((name, idx) => {
                const monthNum = idx + 1;
                const status = monthStatuses.find(
                  (s) => s.month === monthNum,
                );
                const hasData = status?.hasData ?? false;
                const isFuture =
                  yearNum === currentYear && monthNum > currentMonth;
                const isCurrent =
                  yearNum === currentYear && monthNum === currentMonth;

                return (
                  <button
                    key={monthNum}
                    disabled={isFuture}
                    onClick={() =>
                      router.push(`/dashboard/kpi/${year}/${monthNum}`)
                    }
                    className={cn(
                      "group rounded-xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-teal-500",
                      isFuture
                        ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
                        : hasData
                          ? "cursor-pointer border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-teal-300"
                          : "cursor-pointer border-dashed border-gray-200 bg-white hover:border-gray-300",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          {name.slice(0, 3)}
                        </p>
                        <p className="mt-0.5 text-lg font-bold text-gray-900">
                          {String(monthNum).padStart(2, "0")}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-700">
                          Now
                        </span>
                      ) : hasData ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isFuture ? null : (
                        <Clock className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-3 text-xs",
                        hasData ? "text-green-600" : "text-gray-400",
                      )}
                    >
                      {isFuture
                        ? "Upcoming"
                        : hasData
                          ? "Data available"
                          : "No data"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

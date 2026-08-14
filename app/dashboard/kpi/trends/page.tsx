"use client";

import { cn } from "@/libs/kpi/utils";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 5 + i);
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type KpiSeries = {
  id: string;
  key: string;
  label: string;
  unit: string;
  category: string | null;
  series: { month: string; value: number | null; source: string | null }[];
};

function formatValue(value: number | null, unit: string) {
  if (value === null) return "—";
  if (unit === "PERCENT") return `${(value * 100).toFixed(1)}%`;
  if (unit === "LAKHS") return `₹${value.toFixed(2)}L`;
  return value.toLocaleString("en-IN");
}

const CHART_COLORS = [
  "#0d9488", "#6366f1", "#f59e0b", "#ef4444",
  "#8b5cf6", "#10b981", "#f97316", "#3b82f6",
];

export default function KpiTrendsPage() {
  const [fromYear, setFromYear] = useState(CURRENT_YEAR - 2);
  const [toYear, setToYear] = useState(CURRENT_YEAR);
  const [kpis, setKpis] = useState<KpiSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedKpiKey, setSelectedKpiKey] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const from = `${fromYear}-01`;
      const to = `${toYear}-12`;
      const res = await fetch(`/api/kpi/range?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch trends");
      const json = await res.json();
      setKpis(json.kpis || []);
      setSelectedKpiKey(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load trends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(kpis.map((k) => k.category || "General"));
    return ["All", ...Array.from(cats).sort()];
  }, [kpis]);

  const filteredKpis = useMemo(() => {
    return kpis.filter(
      (k) =>
        selectedCategory === "All" ||
        (k.category || "General") === selectedCategory,
    );
  }, [kpis, selectedCategory]);

  const activeKpi = useMemo(
    () =>
      selectedKpiKey
        ? kpis.find((k) => k.key === selectedKpiKey) ?? null
        : null,
    [kpis, selectedKpiKey],
  );

  // Build chart data: one row per month, each KPI as a column
  const chartData = useMemo(() => {
    if (!filteredKpis.length) return [];
    const allMonths = filteredKpis[0].series.map((s) => s.month);
    return allMonths.map((monthIso, idx) => {
      const date = new Date(monthIso);
      const row: Record<string, any> = {
        month: `${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`,
      };
      for (const k of filteredKpis) {
        row[k.key] = k.series[idx]?.value ?? null;
      }
      return row;
    });
  }, [filteredKpis]);

  const singleChartData = useMemo(() => {
    if (!activeKpi) return [];
    return activeKpi.series.map((s) => {
      const date = new Date(s.month);
      return {
        month: `${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`,
        value: s.value,
      };
    });
  }, [activeKpi]);

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                KPI Trends
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Track performance metrics over time across all categories.
            </p>
          </div>

          {/* Year Range Picker */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-500">From</label>
              <select
                value={fromYear}
                onChange={(e) => setFromYear(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <span className="mt-4 text-gray-400">—</span>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-500">To</label>
              <select
                value={toYear}
                onChange={(e) => setToYear(Number(e.target.value))}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {YEARS.filter((y) => y >= fromYear).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Apply"}
            </button>
          </div>
        </motion.div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setSelectedKpiKey(null); }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                selectedCategory === cat
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-64 items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <TrendingUp className="h-10 w-10 animate-pulse" />
                <p className="text-sm">Loading trend data...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="charts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* KPI Selector Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredKpis.map((k) => {
                  const last = [...k.series].reverse().find((s) => s.value !== null);
                  return (
                    <button
                      key={k.key}
                      onClick={() =>
                        setSelectedKpiKey(
                          selectedKpiKey === k.key ? null : k.key,
                        )
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        selectedKpiKey === k.key
                          ? "border-teal-500 bg-teal-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
                      )}
                    >
                      <p className="text-xs font-medium text-gray-500 truncate">{k.label}</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {formatValue(last?.value ?? null, k.unit)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Single KPI Deep Dive Chart */}
              {activeKpi && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">
                    {activeKpi.label}
                  </h3>
                  <p className="mb-6 text-xs text-gray-400 uppercase tracking-wide">
                    {activeKpi.unit} · {fromYear}–{toYear}
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={singleChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          fontSize: "12px",
                        }}
                        formatter={(v: any) =>
                          formatValue(v, activeKpi.unit)
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#0d9488" }}
                        activeDot={{ r: 5 }}
                        connectNulls
                        name={activeKpi.label}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Multi-KPI Overview Chart (when no single KPI is selected) */}
              {!activeKpi && filteredKpis.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">
                    {selectedCategory === "All" ? "All KPIs" : selectedCategory} Overview
                  </h3>
                  <p className="mb-6 text-xs text-gray-400">
                    Click a KPI above for a detailed view
                  </p>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "16px" }}
                      />
                      {filteredKpis.map((k, i) => (
                        <Line
                          key={k.key}
                          type="monotone"
                          dataKey={k.key}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          name={k.label}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

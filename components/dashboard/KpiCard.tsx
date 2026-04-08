import { formatKpiValue } from "@/libs/kpi/format";
import { cn } from "@/libs/kpi/utils";
import { motion } from "framer-motion";
import { Activity, Target } from "lucide-react";
import { useMemo } from "react";
import CountUp from "react-countup";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export type TrendPt = {
  month: string;
  value: number | null;
  source: "MANUAL" | "AUTO" | null;
};

export type KpiDto = {
  id: string;
  key: string;
  label: string;
  unit: "COUNT" | "PERCENT" | "LAKHS";
  category: string | null;
  sortOrder: number;
  currentValue: number | null;
  currentSource: "MANUAL" | "AUTO" | null;
  month: string;
  trend: TrendPt[];
  target: {
    fiscalLabel: string;
    targetValue: number;
    startDate: string;
    endDate: string;
  } | null;
};

export function KpiCard({ kpi, index }: { kpi: KpiDto; index: number }) {
  const value =
    kpi.unit === "PERCENT"
      ? (kpi.currentValue || 0) * 100
      : kpi.currentValue || 0;
  const isManual = kpi.currentSource === "MANUAL";

  const hasTarget = !!kpi.target && kpi.target.targetValue > 0;
  const targetValue = hasTarget ? kpi.target!.targetValue : null;
  const pctToTarget =
    hasTarget && targetValue ? Math.min(100, (value / targetValue) * 100) : 0;

  const chartData = useMemo(() => {
    return kpi.trend.map((t) => ({
      name: t.month,
      value: t.value || 0,
    }));
  }, [kpi.trend]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white/70 p-5 backdrop-blur-xl transition-all hover:shadow-xl",
        isManual ? "border-amber-200" : "border-gray-100",
      )}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/5 blur-[50px] transition-all group-hover:bg-blue-500/10" />

      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Activity className="h-4 w-4 text-blue-500" />
            {kpi.label}
          </div>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ring-1 ring-inset",
              isManual
                ? "bg-amber-50 text-amber-600 ring-amber-500/20"
                : "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
            )}
          >
            {isManual ? "Manual" : "Auto"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-gray-900">
            {kpi.currentValue !== null ? (
              <CountUp
                end={value}
                decimals={
                  kpi.unit === "LAKHS" ? 2 : kpi.unit === "PERCENT" ? 1 : 0
                }
                duration={2}
                separator=","
                prefix={kpi.unit === "LAKHS" ? "₹ " : ""}
              />
            ) : (
              "0"
            )}
          </span>
          {kpi.unit === "LAKHS" && (
            <span className="text-lg font-medium text-gray-500">L</span>
          )}
          {kpi.unit === "PERCENT" && (
            <span className="text-lg font-medium text-gray-500">%</span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Target className="h-3.5 w-3.5" /> Target
            </div>
            {hasTarget ? (
              <span className="text-gray-700">
                {formatKpiValue(targetValue, kpi.unit)}
              </span>
            ) : (
              <span className="text-gray-400 italic">N/A</span>
            )}
          </div>

          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            {hasTarget && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctToTarget}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-linear-to-r",
                  pctToTarget >= 100
                    ? "from-emerald-400 to-emerald-500"
                    : "from-blue-400 to-indigo-500",
                )}
              />
            )}
          </div>
        </div>

        <div className="h-10 w-full pt-2 opacity-60 transition-opacity group-hover:opacity-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id={`gradient-${kpi.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${kpi.id})`}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

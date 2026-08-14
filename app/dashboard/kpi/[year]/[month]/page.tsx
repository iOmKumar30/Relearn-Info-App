"use client";

import { KpiCard, type KpiDto } from "@/components/dashboard/KpiCard";
import { KpiSkeleton } from "@/components/dashboard/KpiSkeleton";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHLY_FINANCE_KPI_KEYS = new Set([
  "finance.revenue.monthly.lakhs",
  "finance.expenditure.monthly.lakhs",
]);

export default function KpiMonthPage() {
  const { year, month } = useParams<{ year: string; month: string }>();
  const [kpis, setKpis] = useState<KpiDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/kpi/month/${year}/${month}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        // Map the month route shape to KpiDto shape (add empty trend array)
        const mapped = (json.kpis || []).map((k: any) => ({
          ...k,
          currentValue: k.value,
          currentSource: k.source,
          trend: [],
        }));
        setKpis(mapped);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load KPIs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  const groups = useMemo(() => {
    const g = new Map<string, KpiDto[]>();
    for (const k of kpis) {
      const group = k.category || "General";
      if (group === "Finance" && !MONTHLY_FINANCE_KPI_KEYS.has(k.key)) continue;
      if (!g.has(group)) g.set(group, []);
      g.get(group)!.push(k);
    }
    for (const arr of g.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return g;
  }, [kpis]);

  const monthLabel = `${MONTH_NAMES[parseInt(month)]} ${year}`;

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/kpi/${year}`}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                  {monthLabel}
                </h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                KPI snapshot for {monthLabel}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <KpiSkeleton key={i} />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-10"
              >
                {Array.from(groups.entries()).map(([cat, arr]) => (
                  <section key={cat} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-800">{cat}</h3>
                      <div className="h-px flex-1 bg-linear-to-r from-gray-200 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {arr.map((k, idx) => (
                        <KpiCard key={k.id} kpi={k} index={idx} />
                      ))}
                    </div>
                  </section>
                ))}
                {groups.size === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <Calendar className="mb-4 h-12 w-12 opacity-30" />
                    <p className="text-lg font-medium">No data for {monthLabel}</p>
                    <p className="mt-1 text-sm">KPIs haven't been synced for this month yet.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

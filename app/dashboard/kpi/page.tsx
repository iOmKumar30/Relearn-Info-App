"use client";

import { Button } from "flowbite-react";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import RBACGate from "@/components/RBACGate";
import { KpiCard, type KpiDto } from "@/components/dashboard/KpiCard";
import { KpiManualModal } from "@/components/dashboard/KpiManualModal";
import { KpiSkeleton } from "@/components/dashboard/KpiSkeleton";
import { KpiTargetModal } from "@/components/dashboard/KpiTargetModal";
import { cn } from "@/libs/kpi/utils";

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      {[1, 2].map((section) => (
        <section key={section} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-px flex-1 bg-linear-to-r from-gray-200 to-transparent" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function KpiDashboardPage() {
  const [kpis, setKpis] = useState<KpiDto[]>([]);
  // Start with a true 'initial mount' loading state
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const url = new URL("/api/kpi", window.location.origin);
      url.searchParams.set("monthsBack", "6");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch KPIs");
      const json = await res.json();
      setKpis(json.kpis || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load KPIs");
    } finally {
      setLoading(false);
      setIsInitialLoad(false); // Mark initial load complete
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAutoUpdate = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing live data...");

    try {
      const month = new Date();
      const y = month.getUTCFullYear();
      const m = String(month.getUTCMonth() + 1).padStart(2, "0");

      const res = await fetch("/api/kpi/auto-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: `${y}-${m}` }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Sync successfully queued!", { id: toastId });

      // Wait 3 seconds for Trigger.dev to process before refreshing UI
      setTimeout(() => {
        load(true);
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Sync failed", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const groups = useMemo(() => {
    const g = new Map<string, KpiDto[]>();
    for (const k of kpis) {
      const group = k.category || "General";
      if (!g.has(group)) g.set(group, []);
      g.get(group)!.push(k);
    }
    for (const arr of g.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return g;
  }, [kpis]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a completely blank matching background to prevent layout shift
    return <div className="min-h-screen bg-[#fafafa]" />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Performance Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Live metrics and targets across all operations.
            </p>
          </div>

          <RBACGate roles={["ADMIN"]}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Buttons remain the exact same */}
              <Button
                color="light"
                onClick={handleAutoUpdate}
                disabled={isSyncing || isInitialLoad}
                className="group flex items-center shadow-sm"
              >
                <RefreshCw
                  className={cn(
                    "mr-2 h-4 w-4 text-gray-500 transition-transform",
                    isSyncing && "animate-spin",
                  )}
                />
                {isSyncing ? "Syncing..." : "Sync Live Data"}
              </Button>
              <Button
                color="light"
                disabled={isInitialLoad}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("kpi:openManualModal"))
                }
                className="shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4 text-gray-500" />
                Manual Entry
              </Button>
              <Button
                color="dark"
                disabled={isInitialLoad}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("kpi:openTargetModal"))
                }
                className="shadow-md transition-transform hover:scale-105"
              >
                <Crosshair className="mr-2 h-4 w-4" />
                Set Targets
              </Button>
            </div>
          </RBACGate>
        </motion.div>

        {/* Content Section with AnimatePresence for smooth transitions */}
        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {isInitialLoad || loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <DashboardSkeleton />
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
                      <h3 className="text-lg font-semibold text-gray-800">
                        {cat}
                      </h3>
                      <div className="h-px flex-1 bg-linear-to-r from-gray-200 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {arr.map((k, idx) => (
                        <KpiCard key={k.id} kpi={k} index={idx} />
                      ))}
                    </div>
                  </section>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <RBACGate roles={["ADMIN"]}>
          <KpiManualModal onSaved={() => load(true)} />
          <KpiTargetModal onSaved={() => load(true)} />
        </RBACGate>
      </div>
    </div>
  );
}

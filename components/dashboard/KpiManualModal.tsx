"use client";

import { cn } from "@/libs/kpi/utils";
import { Button } from "flowbite-react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type KpiDto = { id: string; key: string; label: string; unit: string };

export function KpiManualModal({
  onSaved,
}: {
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [kpis, setKpis] = useState<KpiDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [kpiKey, setKpiKey] = useState("");
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("kpi:openManualModal", openHandler);
    return () => window.removeEventListener("kpi:openManualModal", openHandler);
  }, []);

  useEffect(() => {
    if (open && kpis.length === 0) {
      (async () => {
        try {
          const res = await fetch("/api/kpi?monthsBack=1");
          if (res.ok) {
            const json = await res.json();
            setKpis(json.kpis || []);
          }
        } catch (error) {
          console.error("Failed to load KPIs for modal", error);
        }
      })();
    }
  }, [open, kpis.length]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiKey) return toast.error("Please select a KPI");
    if (!month) return toast.error("Please select a month");
    if (value === "") return toast.error("Please enter a numeric value");

    setIsLoading(true);
    const toastId = toast.loading("Saving manual entry...");

    try {
      const res = await fetch("/api/kpi/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpiKey, month, value: Number(value) }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Manual value saved successfully!", { id: toastId });
      setOpen(false);
      setKpiKey("");
      setValue("");
      await onSaved();
    } catch (error: any) {
      toast.error(error.message || "Failed to save entry", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isLoading && setOpen(false)}
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <Edit3 className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manual KPI Entry
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={isLoading}
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Select Metric
                  </label>
                  <select
                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={kpiKey}
                    onChange={(e) => setKpiKey(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="" disabled>
                      Choose a KPI...
                    </option>
                    {kpis.map((k) => (
                      <option key={k.id} value={k.key}>
                        {k.label} ({k.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Target Month
                  </label>
                  <input
                    type="month"
                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Override Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter numeric value..."
                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    This will flag the record as "MANUAL".
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 pt-2">
                <Button
                  color="light"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                  className="rounded-xl border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex items-center rounded-xl font-medium shadow-sm transition-all bg-green-400 hover:shadow-md"
                >
                  <Save
                    className={cn(
                      "mr-2 h-4 w-4 transition-transform group-hover:scale-110",
                      isLoading && "animate-pulse",
                    )}
                  />
                  {isLoading ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

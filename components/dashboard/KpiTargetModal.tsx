"use client";

import { Button } from "flowbite-react";
import { useEffect, useState } from "react";

type KpiDto = { id: string; key: string; label: string; unit: string };

export function KpiTargetModal({
  onSaved,
}: {
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [kpis, setKpis] = useState<KpiDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [kpiKey, setKpiKey] = useState("");
  const [fiscalLabel, setFiscalLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetValue, setTargetValue] = useState("");

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("kpi:openTargetModal", openHandler);
    return () => window.removeEventListener("kpi:openTargetModal", openHandler);
  }, []);

  useEffect(() => {
    if (open && kpis.length === 0) {
      fetch("/api/kpi?monthsBack=1")
        .then((res) => res.json())
        .then((data) => setKpis(data.kpis || []))
        .catch(console.error);
    }
  }, [open, kpis.length]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiKey || !fiscalLabel || !startDate || !endDate || !targetValue) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/kpi/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kpiKey,
          fiscalLabel,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          targetValue: Number(targetValue),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setOpen(false);
      setKpiKey("");
      setFiscalLabel("");
      setStartDate("");
      setEndDate("");
      setTargetValue("");
      await onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save target");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-xl font-semibold text-gray-800">
          Set KPI Target
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              KPI Metric
            </label>
            <select
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={kpiKey}
              onChange={(e) => setKpiKey(e.target.value)}
              required
            >
              <option value="" disabled>
                Select KPI to target
              </option>
              {kpis.map((k) => (
                <option key={k.id} value={k.key}>
                  {k.label} ({k.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fiscal Label (e.g. FY 25-26)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={fiscalLabel}
              onChange={(e) => setFiscalLabel(e.target.value)}
              placeholder="FY 25-26"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Target Value
            </label>
            <input
              type="number"
              step="any"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Enter numeric target"
              required
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
            <Button
              color="light"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Target"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// app/dashboard/kpi/page.tsx
"use client";

import RBACGate from "@/components/RBACGate";
import { formatKpiValue } from "@/libs/kpi/format";
import { Button } from "flowbite-react";
import { useEffect, useMemo, useState } from "react";

type TrendPt = {
  month: string;
  value: number | null;
  source: "MANUAL" | "AUTO" | null;
};
type KpiDto = {
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

export default function KpiDashboardPage() {
  const [kpis, setKpis] = useState<KpiDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const url = new URL("/api/kpi", window.location.origin);
      url.searchParams.set("monthsBack", "6");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setKpis(json.kpis || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const g = new Map<string, KpiDto[]>();
    for (const k of kpis) {
      const group = k.category || "General";
      if (!g.has(group)) g.set(group, []);
      g.get(group)!.push(k);
    }
    for (const [key, arr] of g.entries())
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return g;
  }, [kpis]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">KPI Dashboard</h2>
        <RBACGate roles={["ADMIN"]}>
          <div className="flex gap-2">
            <Button
              color="light"
              onClick={async () => {
                const month = new Date();
                const y = month.getUTCFullYear();
                const m = String(month.getUTCMonth() + 1).padStart(2, "0");
                const res = await fetch("/api/kpi/auto-update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ month: `${y}-${m}` }),
                });
                if (!res.ok) alert(await res.text());
                await load();
              }}
            >
              Update Automatically
            </Button>
            <Button
              color="light"
              onClick={() => {
                const ev = new CustomEvent("kpi:openManualModal");
                window.dispatchEvent(ev);
              }}
            >
              Enter Manually
            </Button>
          </div>
        </RBACGate>
      </div>

      {err && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading KPIs…</div>
      ) : (
        Array.from(groups.entries()).map(([cat, arr]) => (
          <section key={cat}>
            <h3 className="text-lg font-medium mb-3">{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {arr.map((k) => (
                <KpiCard key={k.id} kpi={k} />
              ))}
            </div>
          </section>
        ))
      )}

      <RBACGate roles={["ADMIN"]}>
        <KpiManualModal onSaved={load} />
      </RBACGate>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KpiDto }) {
  const value = formatKpiValue(kpi.currentValue, kpi.unit);
  const source = kpi.currentSource ?? "AUTO";
  const pctToTarget =
    kpi.target && kpi.currentValue != null && kpi.target.targetValue > 0
      ? Math.max(0, Math.min(1, kpi.currentValue / kpi.target.targetValue))
      : null;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow transition">
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-500">{kpi.label}</div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {source === "MANUAL" ? "Manual" : "Auto"}
        </span>
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>

      {pctToTarget !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Target</span>
            <span>{formatKpiValue(kpi.target!.targetValue, kpi.unit)}</span>
          </div>
          <div className="mt-1 h-2 w-full bg-gray-100 rounded">
            <div
              className="h-2 rounded bg-blue-500 transition-all"
              style={{ width: `${pctToTarget * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        {/* Simple trend dots */}
        <div className="flex gap-1">
          {kpi.trend.map((t, i) => (
            <span
              key={i}
              title={`${new Date(t.month).toLocaleDateString()} • ${
                t.value ?? "—"
              }`}
              className={`inline-block w-2 h-2 rounded-full ${
                t.value == null
                  ? "bg-gray-200"
                  : t.source === "MANUAL"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiManualModal({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [kpis, setKpis] = useState<KpiDto[]>([]);
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
    (async () => {
      const res = await fetch("/api/kpi?monthsBack=1");
      if (res.ok) {
        const json = await res.json();
        setKpis(json.kpis || []);
      }
    })();
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-lg bg-white p-4">
        <div className="text-lg font-medium mb-3">Enter KPI Manually</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">KPI</label>
            <select
              className="w-full rounded border px-3 py-2"
              value={kpiKey}
              onChange={(e) => setKpiKey(e.target.value)}
            >
              <option value="">Select KPI</option>
              {kpis.map((k) => (
                <option key={k.id} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Month</label>
            <input
              type="month"
              className="w-full rounded border px-3 py-2"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Value</label>
            <input
              type="number"
              step="any"
              className="w-full rounded border px-3 py-2"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter numeric value"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button color="light" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!kpiKey) return alert("Please select a KPI");
              if (!month) return alert("Please select a month");
              if (value === "") return alert("Please enter a value");
              const res = await fetch("/api/kpi/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kpiKey, month, value: Number(value) }),
              });
              if (!res.ok) return alert(await res.text());
              setOpen(false);
              setKpiKey("");
              setValue("");
              await onSaved();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

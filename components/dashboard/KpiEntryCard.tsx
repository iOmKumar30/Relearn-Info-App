"use client";

import { BarChart3, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function KpiEntryCard() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/kpi")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Decorative gradient blob */}
      <div
        className={`pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-2xl transition-transform duration-500 ${
          hovered ? "scale-110" : "scale-100"
        }`}
      />

      <div className="flex items-start gap-5">
        {/* Icon badge */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <BarChart3 className="h-6 w-6" />
        </div>

        {/* Text content */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              KPI Overview
            </h2>
            <ChevronRight
              className={`h-5 w-5 text-slate-400 transition-transform ${
                hovered ? "translate-x-1" : "translate-x-0"
              }`}
            />
          </div>

          <p className="mt-1 text-sm text-slate-600">
            Track core metrics like students, tutors, and classrooms. Set
            targets and update values automatically or manually.
          </p>

          {/* Sub-feature badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
              Auto Update
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
              Manual Entry
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
              Targets & Trends
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              Role Based Access
            </span>
          </div>
        </div>
      </div>

      {/* Hover underline accent */}
      <div className="mt-6 h-0.5 w-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 transition-all duration-500 group-hover:w-full" />
    </button>
  );
}

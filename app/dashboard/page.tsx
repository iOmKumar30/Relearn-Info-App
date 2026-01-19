"use client";

import KpiEntryCard from "@/components/dashboard/KpiEntryCard";

export default function Dashboard() {
  return (
    <div className="min-h-[70vh] w-full px-6 py-10 bg-linear-to-br from-slate-50 to-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        </div>

        <KpiEntryCard />

        {/* Room for future cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* <AnotherCard /> */}
        </div>
      </div>
    </div>
  );
}

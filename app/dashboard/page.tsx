'use client';

import KpiEntryCard from '@/components/dashboard/KpiEntryCard';

export default function Dashboard() {
  return (
    <div className="min-h-[70vh] w-full bg-linear-to-br from-slate-50 to-white px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        </div>

        <KpiEntryCard />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Future dashboard cards */}
        </div>
      </div>
    </div>
  );
}

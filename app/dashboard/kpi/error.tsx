'use client';

export default function KpiError({ reset }: { error: Error; reset: () => void }) {
  return <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Unable to load KPI data. <button type="button" onClick={reset} className="ml-2 underline">Try again</button></div>;
}

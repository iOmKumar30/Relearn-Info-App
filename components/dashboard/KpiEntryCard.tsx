'use client';

import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  History,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function KpiEntryCard() {
  return (
    <section
      aria-labelledby="kpi-entry-heading"
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-28px_rgba(15,23,42,0.28)]"
    >
      {/* Subtle decorative background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-blue-50 via-white to-indigo-50/70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-200/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Performance centre
            </div>

            <h2
              id="kpi-entry-heading"
              className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              Key Performance Indicators
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              Monitor live organisation metrics, review trends, manage targets,
              and explore monthly or yearly historical KPI records.
            </p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 sm:p-5">
        <Link
          href="/dashboard/kpi"
          className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:p-6"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-100/70 transition-transform duration-500 group-hover:scale-150"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
                <ChevronRight
                  className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>

            <h3 className="mt-6 text-lg font-bold tracking-tight text-slate-900">
              Live KPI
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              View the current month’s KPIs, trends, targets, and the latest
              automatic or manual values.
            </p>
          </div>

          <span className="relative mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            Open live dashboard
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>

        <Link
          href="dashboard/kpi/historical"
          className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/10 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-6"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-100/70 transition-transform duration-500 group-hover:scale-150"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                <History className="h-5 w-5" aria-hidden="true" />
              </div>

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white">
                <ChevronRight
                  className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>

            <h3 className="mt-6 text-lg font-bold tracking-tight text-slate-900">
              Historical KPI
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Browse KPI years, open year-to-date or completed-year summaries,
              and inspect individual monthly snapshots.
            </p>
          </div>

          <span className="relative mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
            Browse KPI history
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}

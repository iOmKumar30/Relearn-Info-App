"use client";

import { ArrowRightIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function YearGrid({ years }: { years: number[] }) {
  if (!years || years.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="p-5 bg-gray-50 rounded-2xl mb-5">
          <CalendarDaysIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 tracking-tight">
          No Academic Years Found
        </h3>
        <p className="text-gray-500 mt-2 text-sm font-medium">
          Click "Create New Year" at the top right to get started.
        </p>
      </div>
    );
  }

  const sortedYears = [...years].sort((a, b) => b - a);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sortedYears.map((year) => (
        <Link key={year} href={`/attendance/${year}`} className="group block outline-none">
          <div className="relative h-full p-6 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-400 overflow-hidden">
            
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-linear-to-br from-blue-50 to-indigo-50 rounded-full opacity-60 group-hover:scale-150 transition-transform duration-700 ease-out"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                  <CalendarDaysIcon className="w-6 h-6 stroke-2" />
                </div>
                
                {/* Subtle indicator for current/latest year */}
                {year === sortedYears[0] && (
                  <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider rounded-full border border-green-100/50">
                    Latest
                  </span>
                )}
              </div>

              <div className="mt-auto">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">
                  Academic Year
                </p>
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">
                  {year}
                </h3>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-50 flex items-center justify-between text-gray-500 group-hover:text-blue-600 transition-colors duration-300 font-medium text-sm">
                <span>Manage Attendance</span>
                <div className="p-1.5 rounded-full bg-gray-50 group-hover:bg-blue-50 transition-colors">
                  <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

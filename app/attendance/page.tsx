import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Suspense } from "react";
import { getActiveYears } from "./actions"; 
import CreateYearButton from "./CreateYearButton";
import YearGrid from "./YearGrid";

export default async function AttendancePage() {
  const years = await getActiveYears();

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-100px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100/50">
            <CalendarDaysIcon className="w-8 h-8 text-blue-600 stroke-2" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Attendance Management
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base font-medium">
              Select an academic year to manage monthly classroom attendance
              records.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <CreateYearButton existingYears={years} />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64 bg-white/30 backdrop-blur-sm rounded-3xl border border-gray-50">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-600"></div>
              <p className="text-sm font-medium text-gray-400 animate-pulse">
                Loading Academic Years...
              </p>
            </div>
          </div>
        }
      >
        <YearGrid years={years} />
      </Suspense>
    </div>
  );
}

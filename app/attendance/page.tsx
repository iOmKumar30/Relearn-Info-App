import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Suspense } from "react";
import { getActiveYears } from "./actions";
import CreateYearButton from "./CreateYearButton";
import YearGrid from "./YearGrid";

export default async function AttendancePage() {
  const years = await getActiveYears();

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-100px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Attendance Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Select an academic year to manage monthly classroom attendance
              records.
            </p>
          </div>
        </div>

        <CreateYearButton existingYears={years} />
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <YearGrid years={years} />
      </Suspense>
    </div>
  );
}

import { PresentationChartLineIcon } from "@heroicons/react/24/outline";
import { Suspense } from "react";
import { getPayoutRates, getTutorTrainingYears } from "./actions";
import CreateYearButton from "./CreateYearButton";
import PayoutRateModal from "./PayoutRateModal";
import YearGrid from "./YearGrid";

export default async function TutorAttendancePage() {
  const years = await getTutorTrainingYears();
  const currentRates = await getPayoutRates();

  return (
    <div className="mx-auto min-h-[calc(100vh-100px)] max-w-7xl">
      <div className="mb-8 flex flex-col justify-between gap-6 rounded-3xl border border-gray-100/80 bg-white/60 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl sm:p-6 md:flex-row md:items-center lg:p-8">
        <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
          <div className="shrink-0 rounded-2xl border border-blue-100/50 bg-linear-to-br from-blue-50 to-indigo-50 p-3 shadow-sm sm:p-4">
            <PresentationChartLineIcon className="h-7 w-7 stroke-2 text-blue-600 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-4xl">
              Tutor Training Attendance
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base font-medium">
              Select an academic year to manage weekly tutor training attendance
              and payouts.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:shrink-0">
          <PayoutRateModal currentRates={currentRates} />
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

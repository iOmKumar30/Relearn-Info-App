import {
  ArrowRightIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function TutorTrainingMonthsPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;

  return (
    <div className="mx-auto min-h-[calc(100vh-100px)] max-w-7xl bg-gray-50/30">
      <div className="mb-10">
        <Link
          href="/tutor-attendance"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to Years
        </Link>

        <div className="flex flex-col justify-between gap-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-center">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <div className="shrink-0 rounded-xl bg-blue-50 p-3">
              <CalendarIcon className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Training Months {year}
              </h1>
              <Breadcrumbs
                className="mt-1"
                items={[
                  { label: "Tutor Attendance", href: "/tutor-attendance" },
                  { label: year },
                ]}
              />
              <p className="text-gray-500 mt-1 text-sm md:text-base">
                Select a month to manage classes, attendance, and calculate
                payouts.
              </p>
            </div>
          </div>

          <div className="w-full shrink-0 sm:w-auto">
            <Link
              href={`/tutor-attendance/${year}/quarterly`}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-3 font-medium text-indigo-700 shadow-sm transition-all duration-200 hover:bg-indigo-100 hover:shadow-md active:scale-95 sm:w-auto"
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>View Quarterly Reports</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {MONTHS.map((monthName, index) => {
          const monthNum = index + 1;

          return (
            <Link
              key={monthNum}
              href={`/tutor-attendance/${year}/${monthNum}`}
              className="group block"
            >
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-blue-50 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:from-blue-100 transition-colors"></div>

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-blue-50/50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors z-10 relative">
                      <span className="font-bold text-lg leading-none block">
                        {String(monthNum).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 tracking-tight z-10 relative">
                    {monthName}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 z-10 relative">
                    Record attendance
                  </p>
                </div>

                <div className="mt-6 flex items-center text-blue-600 font-medium text-sm border-t border-gray-50 pt-4">
                  Open Month
                  <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

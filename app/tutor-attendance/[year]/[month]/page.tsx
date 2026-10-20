import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import {
  getActiveMasterTutorOptions,
  getMonthlyTrainingData,
  getPayoutRates,
} from '../../actions';
import MonthlyAttendanceClient from './MonthlyAttendanceClient';

export const dynamic = 'force-dynamic';

export default async function MonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: rawYear, month: rawMonth } = await params;
  const year = parseInt(rawYear);
  const month = parseInt(rawMonth);

  const monthNames = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = monthNames[month];

  const [data, currentRates, masterTutors] = await Promise.all([
    getMonthlyTrainingData(year, month),
    getPayoutRates(),
    getActiveMasterTutorOptions(),
  ]);
  return (
    <div className="mx-auto min-h-[calc(100vh-100px)] max-w-[1600px] bg-gray-50/30 p-0 sm:p-2">
      <div className="mb-6">
        <Link
          href={`/tutor-attendance/${year}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to Months
        </Link>
      </div>

      <MonthlyAttendanceClient
        year={year}
        month={month}
        monthName={monthName}
        initialData={data}
        currentRates={currentRates}
        masterTutors={masterTutors}
      />
    </div>
  );
}

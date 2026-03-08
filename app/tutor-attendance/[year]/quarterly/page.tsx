import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import QuarterlyReportClient from "./QuarterlyReportClient";

export default async function QuarterlyPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: rawYear } = await params;
  const year = parseInt(rawYear);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-100px)] bg-gray-50/30">
      <div className="mb-6">
        <Link
          href={`/tutor-attendance/${year}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to Months
        </Link>
      </div>

      <QuarterlyReportClient year={year} />
    </div>
  );
}

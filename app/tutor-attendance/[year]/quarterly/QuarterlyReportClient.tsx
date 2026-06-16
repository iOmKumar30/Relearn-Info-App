"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import { ChartBarIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getQuarterlyReportData } from "../../actions";

const MONTHS = [
  { id: 1, name: "January" },
  { id: 2, name: "February" },
  { id: 3, name: "March" },
  { id: 4, name: "April" },
  { id: 5, name: "May" },
  { id: 6, name: "June" },
  { id: 7, name: "July" },
  { id: 8, name: "August" },
  { id: 9, name: "September" },
  { id: 10, name: "October" },
  { id: 11, name: "November" },
  { id: 12, name: "December" },
];

export default function QuarterlyReportClient({ year }: { year: number }) {
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<{
    tutors: any[];
    facilitatorSummary: any[];
  } | null>(null);

  useEffect(() => {
    fetchReportData(1, 3);
  }, []);

  const fetchReportData = async (start: number, end: number) => {
    if (start > end) {
      toast.error("Start month cannot be after end month");
      return;
    }

    setIsLoading(true);
    try {
      const result = await getQuarterlyReportData(year, start, end);
      setData(result);
    } catch (error) {
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchReportData(startMonth, endMonth);
  };

  const currentRangeString = useMemo(() => {
    const startName = MONTHS.find((m) => m.id === startMonth)?.name;
    const endName = MONTHS.find((m) => m.id === endMonth)?.name;
    if (startName === endName) return `${startName}-${year}`;
    return `${startName}-${endName}-${year}`;
  }, [startMonth, endMonth, year]);

  const tutorExportColumns = [
    { label: "S.No", key: "sno" },
    { label: "Tutor Name", key: "name" },
    { label: "Facilitator Name", key: "facilitatorName" },
    { label: "Total Payout (₹)", key: "totalPayout" },
  ];

  const tutorExportRows = useMemo(() => {
    if (!data) return [];
    return data.tutors.map((tutor, idx) => ({
      sno: idx + 1,
      name: tutor.name,
      facilitatorName: tutor.facilitatorName,
      totalPayout: `₹${tutor.totalPayout}`,
    }));
  }, [data]);

  const facilitatorExportColumns = [
    { label: "S.No", key: "sno" },
    { label: "Facilitator Name", key: "name" },
    { label: "Total Amount (₹)", key: "totalAmount" },
  ];

  const facilitatorExportRows = useMemo(() => {
    if (!data) return [];
    return data.facilitatorSummary.map((fac, idx) => ({
      sno: idx + 1,
      name: fac.name,
      totalAmount: `₹${fac.totalAmount}`,
    }));
  }, [data]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col justify-between gap-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600">
            <ChartBarIcon className="h-7 w-7 stroke-2 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Periodic Reports <span className="text-blue-600">{year}</span>
            </h1>
            <Breadcrumbs
              className="mt-1"
              items={[
                { label: "Tutor Attendance", href: "/tutor-attendance" },
                { label: String(year), href: `/tutor-attendance/${year}` },
                { label: "Periodic Reports" },
              ]}
            />
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Filter payouts across custom date ranges.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-3 sm:grid-cols-3 md:w-auto">
          <div className="min-w-0">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">
              Start Month
            </label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(parseInt(e.target.value))}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {MONTHS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">
              End Month
            </label>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(parseInt(e.target.value))}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {MONTHS.map((m) => (
                <option key={m.id} value={m.id} disabled={m.id < startMonth}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FunnelIcon className="w-4 h-4 stroke-2" />
            {isLoading ? "Loading..." : "Filter"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-600"></div>
        </div>
      ) : !data ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-5">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight px-1">
              Tutor Aggregate Payouts
            </h2>
            {data.tutors.length > 0 && (
              <ExportXlsxButton
                fileName={`${currentRangeString}-Tutor-Attendance`}
                columns={tutorExportColumns}
                visibleRows={tutorExportRows}
                sheetName="Tutor Payouts"
              />
            )}
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
              {/* Mobile View - Stacked Cards */}
              <div className="divide-y divide-gray-200 bg-gray-50 md:hidden">
                {data.tutors.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 13h6m-6 4h6M5 7h14M5 17h14M5 21h14"
                        />
                      </svg>
                      <span>No attendance records found for this period.</span>
                    </div>
                  </div>
                ) : (
                  data.tutors.map((tutor, idx) => (
                    <article key={tutor.id} className="bg-white p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            S. No.
                          </p>
                          <p className="text-sm font-semibold text-gray-800">
                            {idx + 1}
                          </p>
                        </div>
                      </div>

                      <dl className="grid grid-cols-1 gap-3">
                        <div className="min-w-0">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Tutor Name
                          </dt>
                          <dd className="mt-0.5 text-sm font-bold text-gray-800">
                            {tutor.name}
                          </dd>
                        </div>
                        <div className="min-w-0 border-t border-gray-100 pt-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Facilitator Name
                          </dt>
                          <dd className="mt-0.5 text-sm text-gray-800">
                            {tutor.facilitatorName}
                          </dd>
                        </div>
                        <div className="min-w-0 border-t border-gray-100 pt-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Total Payout
                          </dt>
                          <dd className="mt-0.5 text-base font-black text-blue-600">
                            ₹{tutor.totalPayout}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))
                )}
              </div>

              {/* Desktop View - Horizontal Scrolling Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[640px] text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="p-4 w-16 text-center">S.No</th>
                      <th className="p-4">Tutor Name</th>
                      <th className="p-4">Facilitator</th>
                      <th className="p-4 text-right text-blue-600">
                        Total Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.tutors.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-12 text-center text-gray-500 font-medium"
                        >
                          No attendance records found for this period.
                        </td>
                      </tr>
                    ) : (
                      data.tutors.map((tutor, idx) => (
                        <tr
                          key={tutor.id}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="p-4 text-gray-400 font-medium text-center">
                            {idx + 1}
                          </td>
                          <td className="p-4 font-bold text-gray-900">
                            {tutor.name}
                          </td>
                          <td className="p-4 text-gray-600 font-medium">
                            {tutor.facilitatorName}
                          </td>
                          <td className="p-4 text-right font-black text-blue-600 text-base bg-blue-50/10">
                            ₹{tutor.totalPayout}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight px-1">
              Facilitator Summary
            </h2>
            {data.facilitatorSummary.length > 0 && (
              <ExportXlsxButton
                fileName={`${currentRangeString}-Facilitator-Summary`}
                columns={facilitatorExportColumns}
                visibleRows={facilitatorExportRows}
                sheetName="Facilitator Summary"
              />
            )}
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
              {/* Mobile View - Stacked Cards */}
              <div className="divide-y divide-gray-200 bg-gray-50 md:hidden">
                {data.facilitatorSummary.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 13h6m-6 4h6M5 7h14M5 17h14M5 21h14"
                        />
                      </svg>
                      <span>No data available.</span>
                    </div>
                  </div>
                ) : (
                  data.facilitatorSummary.map((fac, idx) => (
                    <article key={fac.name} className="bg-white p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            S. No.
                          </p>
                          <p className="text-sm font-semibold text-gray-800">
                            {idx + 1}
                          </p>
                        </div>
                      </div>

                      <dl className="grid grid-cols-1 gap-3">
                        <div className="min-w-0">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Facilitator
                          </dt>
                          <dd className="mt-0.5 text-sm font-bold text-gray-800">
                            {fac.name}
                          </dd>
                        </div>
                        <div className="min-w-0 border-t border-gray-100 pt-3">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            Amount
                          </dt>
                          <dd className="mt-0.5 text-base font-black text-emerald-600">
                            ₹{fac.totalAmount}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))
                )}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[420px] text-left text-sm">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="p-4 w-16 text-center">#</th>
                      <th className="p-4">Facilitator</th>
                      <th className="p-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.facilitatorSummary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-8 text-center text-gray-500 font-medium"
                        >
                          No data available.
                        </td>
                      </tr>
                    ) : (
                      data.facilitatorSummary.map((fac, idx) => (
                        <tr
                          key={fac.name}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="p-4 text-gray-400 font-medium text-center">
                            {idx + 1}
                          </td>
                          <td className="p-4 font-bold text-gray-900">
                            {fac.name}
                          </td>
                          <td className="p-4 text-right font-black text-emerald-600 text-base">
                            ₹{fac.totalAmount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

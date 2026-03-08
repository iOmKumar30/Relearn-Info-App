"use client";

import { ChartBarIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
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

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ChartBarIcon className="w-8 h-8 stroke-2" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Periodic Reports <span className="text-blue-600">{year}</span>
            </h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Filter payouts across custom date ranges.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">
              Start Month
            </label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(parseInt(e.target.value))}
              className="bg-white text-sm font-semibold text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer shadow-sm transition-all"
            >
              {MONTHS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">
              End Month
            </label>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(parseInt(e.target.value))}
              className="bg-white text-sm font-semibold text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer shadow-sm transition-all"
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
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
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
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
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
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
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
      )}
    </div>
  );
}

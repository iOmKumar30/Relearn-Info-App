"use client";

import {
  ArrowsUpDownIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import AddClassModal from "./AddClassModal";
import AttendanceToggle from "./AttendanceToggle";

export default function MonthlyAttendanceClient({
  year,
  month,
  monthName,
  initialData,
}: {
  year: number;
  month: number;
  monthName: string;
  initialData: any;
}) {
  const { classes, tutors, facilitatorSummary } = initialData;
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");

  const sortedTutors = [...tutors].sort((a, b) => {
    if (sortOrder === "asc") return a.score - b.score;
    if (sortOrder === "desc") return b.score - a.score;
    return 0;
  });

  const toggleSort = () => {
    setSortOrder((prev) =>
      prev === "none" ? "desc" : prev === "desc" ? "asc" : "none",
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarIcon className="w-8 h-8 stroke-2" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {monthName} {year}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage monthly tutor training records
            </p>
          </div>
        </div>
        <AddClassModal year={year} month={month} />
      </div>

      {/* Main Tutor Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4 w-16 text-center">S.No</th>
                <th className="p-4 min-w-[200px]">Tutor Name</th>
                <th className="p-4 min-w-[180px]">Facilitator</th>

                {/* Dynamic Class Columns */}
                {classes.map((cls: any, i: number) => (
                  <th
                    key={cls.id}
                    className="p-4 text-center min-w-[160px] border-l border-gray-100"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                        Class {i + 1}
                      </span>
                      <span className="text-gray-900">
                        {new Date(cls.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="text-xs font-medium text-gray-400 mt-0.5">
                        By: {cls.trainingBy}
                      </span>
                    </div>
                  </th>
                ))}

                <th
                  className="p-4 border-l border-gray-100 cursor-pointer hover:bg-indigo-50/50 transition-colors select-none"
                  onClick={toggleSort}
                >
                  <div className="flex items-center gap-2 text-indigo-600">
                    Score %
                    {sortOrder === "none" ? (
                      <ArrowsUpDownIcon className="w-4 h-4" />
                    ) : sortOrder === "desc" ? (
                      <ChevronDownIcon className="w-4 h-4 stroke-2" />
                    ) : (
                      <ChevronUpIcon className="w-4 h-4 stroke-2" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right text-emerald-600">
                  Total Payout
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedTutors.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + classes.length}
                    className="p-12 text-center text-gray-500 font-medium"
                  >
                    No active tutors found for this month.
                  </td>
                </tr>
              ) : (
                sortedTutors.map((tutor, idx) => (
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

                    {/* Render Interactive Toggle Cells */}
                    {classes.map((cls: any) => (
                      <td key={cls.id} className="p-4 border-l border-gray-50">
                        <div className="flex justify-center">
                          <AttendanceToggle
                            classId={cls.id}
                            tutorId={tutor.id}
                            currentStatus={tutor.attendanceMap[cls.id]}
                          />
                        </div>
                      </td>
                    ))}

                    <td className="p-4 border-l border-gray-50 font-bold text-gray-800 bg-gray-50/30">
                      {tutor.score}%
                    </td>
                    <td className="p-4 text-right font-black text-emerald-600 text-base bg-emerald-50/10">
                      ₹{tutor.totalPayout}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Facilitator Summary Table */}
      <div className="max-w-3xl">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-5">
          Facilitator Summary
        </h2>
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4 w-16 text-center">S.No</th>
                <th className="p-4">Facilitator Name</th>
                <th className="p-4 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {facilitatorSummary.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-8 text-center text-gray-500 font-medium"
                  >
                    No facilitators found.
                  </td>
                </tr>
              ) : (
                facilitatorSummary.map((fac: any, idx: number) => (
                  <tr
                    key={fac.name}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4 text-gray-400 font-medium text-center">
                      {idx + 1}
                    </td>
                    <td className="p-4 font-bold text-gray-900">{fac.name}</td>
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
  );
}

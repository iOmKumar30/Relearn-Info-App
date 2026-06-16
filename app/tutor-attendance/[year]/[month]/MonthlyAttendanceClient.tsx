"use client";

import {
  ArrowsUpDownIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import { useDebounce } from "@/app/hooks/useDebounce";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import SearchBar from "@/components/CrudControls/SearchBar";
import AddClassModal from "./AddClassModal";
import AttendanceToggle from "./AttendanceToggle";
import DeleteClassButton from "./DeleteClassButton";

export default function MonthlyAttendanceClient({
  year,
  month,
  monthName,
  initialData,
  currentRates,
}: {
  year: number;
  month: number;
  monthName: string;
  initialData: any;
  currentRates: any;
}) {
  const { classes, tutors, facilitatorSummary } = initialData;
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredTutors = tutors.filter((tutor: any) =>
    tutor.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  const sortedTutors = [...filteredTutors].sort((a, b) => {
    if (sortOrder === "asc") return a.score - b.score;
    if (sortOrder === "desc") return b.score - a.score;
    return 0;
  });

  const toggleSort = () => {
    setSortOrder((prev) =>
      prev === "none" ? "desc" : prev === "desc" ? "asc" : "none",
    );
  };

  // Excel export
  const tutorExportColumns = [
    { label: "S.No", key: "sno" },
    { label: "Tutor Name", key: "name" },
    { label: "Facilitator Name", key: "facilitatorName" },
    ...classes.map((cls: any) => {
      const formattedDate = new Date(cls.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return {
        label: `${formattedDate} (${cls.trainingBy})`,
        key: `class_${cls.id}`,
      };
    }),
    { label: "Score %", key: "score" },
    { label: "Total Payout (₹)", key: "totalPayout" },
  ];

  const tutorExportRows = sortedTutors.map((tutor: any, idx: number) => {
    const row: Record<string, any> = {
      sno: idx + 1,
      name: tutor.name,
      facilitatorName: tutor.facilitatorName,
      score: `${tutor.score}%`,
      totalPayout: `₹${tutor.totalPayout}`,
    };

    classes.forEach((cls: any) => {
      row[`class_${cls.id}`] = tutor.attendanceMap[cls.id] || "-";
    });

    return row;
  });

  const facilitatorExportColumns = [
    { label: "S.No", key: "sno" },
    { label: "Facilitator Name", key: "name" },
    { label: "Total Amount (₹)", key: "totalAmount" },
  ];

  const facilitatorExportRows = facilitatorSummary.map(
    (fac: any, idx: number) => ({
      sno: idx + 1,
      name: fac.name,
      totalAmount: `₹${fac.totalAmount}`,
    }),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 md:flex-row md:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600">
            <CalendarIcon className="h-7 w-7 stroke-2 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {monthName} {year}
            </h1>
            <Breadcrumbs
              className="mt-1"
              items={[
                { label: "Tutor Attendance", href: "/tutor-attendance" },
                { label: String(year), href: `/tutor-attendance/${year}` },
                { label: monthName },
              ]}
            />
            <p className="text-sm text-gray-500 mt-1">
              Manage monthly tutor training records
            </p>
          </div>
        </div>
        <AddClassModal year={year} month={month} />
      </div>

      <div className="flex flex-col gap-3 rounded-t-2xl border border-b-0 border-gray-100 bg-white p-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)] md:flex-row md:items-center md:justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search tutors by name..."
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:justify-end">
          <div className="text-sm text-gray-500 font-medium">
            Showing {sortedTutors.length}{" "}
            {sortedTutors.length === 1 ? "tutor" : "tutors"}
          </div>
          <ExportXlsxButton
            fileName={`${monthName}-${year}-Tutor-Attendance`}
            columns={tutorExportColumns}
            visibleRows={tutorExportRows}
            sheetName="Tutor Attendance"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl border border-gray-100 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
        {/* Mobile View - Stacked Cards */}
        <div className="divide-y divide-gray-200 bg-gray-50 md:hidden">
          {sortedTutors.length === 0 ? (
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
                <span>
                  {debouncedSearch
                    ? `No tutors found matching "${debouncedSearch}"`
                    : "No active tutors found for this month."}
                </span>
              </div>
            </div>
          ) : (
            sortedTutors.map((tutor, idx) => (
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
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Facilitator
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-800">
                      {tutor.facilitatorName}
                    </dd>
                  </div>

                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="min-w-0 border-t border-gray-100 pt-3"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {new Date(cls.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}{" "}
                        (By: {cls.trainingBy})
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-800">
                        <div className="flex justify-start">
                          <AttendanceToggle
                            classId={cls.id}
                            tutorId={tutor.id}
                            currentStatus={tutor.attendanceMap[cls.id]}
                            currentRates={currentRates}
                          />
                        </div>
                      </dd>
                    </div>
                  ))}

                  <div className="min-w-0 border-t border-gray-100 pt-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      Score %
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold text-gray-800">
                      {tutor.score}%
                    </dd>
                  </div>

                  <div className="min-w-0 border-t border-gray-100 pt-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Total Payout
                    </dt>
                    <dd className="mt-0.5 text-base font-black text-emerald-600">
                      ₹{tutor.totalPayout}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>

        {/* Desktop View - Horizontal Scrolling Table */}
        <div className="hidden md:block">
          <table className="min-w-[900px] text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4 w-16 text-center">S.No</th>
                <th className="p-4 min-w-[200px]">Tutor Name</th>
                <th className="p-4 min-w-[180px]">Facilitator</th>

                {classes.map((cls: any, i: number) => (
                  <th
                    key={cls.id}
                    className="p-4 text-center min-w-40 border-l border-gray-100"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-2 opacity-60 hover:opacity-100 transition-opacity">
                        <AddClassModal
                          year={year}
                          month={month}
                          mode="edit"
                          initialClass={{
                            id: cls.id,
                            date: cls.date,
                            trainingBy: cls.trainingBy,
                          }}
                          trigger={
                            <button
                              type="button"
                              className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit class details"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          }
                        />

                        <DeleteClassButton
                          classId={cls.id}
                          year={year}
                          month={month}
                        />
                      </div>
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
                    {debouncedSearch
                      ? `No tutors found matching "${debouncedSearch}"`
                      : "No active tutors found for this month."}
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

                    {classes.map((cls: any) => (
                      <td key={cls.id} className="p-4 border-l border-gray-50">
                        <div className="flex justify-center">
                          <AttendanceToggle
                            classId={cls.id}
                            tutorId={tutor.id}
                            currentStatus={tutor.attendanceMap[cls.id]}
                            currentRates={currentRates}
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

      <div className="max-w-3xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Facilitator Summary
          </h2>
          <ExportXlsxButton
            fileName={`${monthName}-${year}-Facilitator-Summary`}
            columns={facilitatorExportColumns}
            visibleRows={facilitatorExportRows}
            sheetName="Facilitator Summary"
          />
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          {/* Mobile View - Stacked Cards */}
          <div className="divide-y divide-gray-200 bg-gray-50 md:hidden">
            {facilitatorSummary.length === 0 ? (
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
                  <span>No facilitators found.</span>
                </div>
              </div>
            ) : (
              facilitatorSummary.map((fac, idx) => (
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
                        Facilitator Name
                      </dt>
                      <dd className="mt-0.5 text-sm font-bold text-gray-800">
                        {fac.name}
                      </dd>
                    </div>
                    <div className="min-w-0 border-t border-gray-100 pt-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Total Amount (₹)
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
          <div className="hidden md:block">
            <table className="min-w-[420px] text-left text-sm">
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
  );
}

// old version: https://gist.github.com/iOmKumar30/f6e4c8eeb31c81034864c6934338c3c4
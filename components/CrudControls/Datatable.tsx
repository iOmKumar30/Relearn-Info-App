"use client";

import { serialNumber } from "@/libs/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import { useEffect, useRef } from "react";

type Column = { key: string; label: string };
type Row = Record<string, any>;

interface DataTableProps {
  columns: Column[];
  rows: Row[];
  actions?: (row: Row) => React.ReactNode;
  onRowClick?: (row: any) => void;
  page: number; // current page number
  pageSize: number; // rows per page
}

export default function DataTable({
  columns,
  rows,
  actions,
  onRowClick,
  page,
  pageSize,
}: DataTableProps) {
  const totalHeadCols = 1 + columns.length + (actions ? 1 : 0);

  // Refs for the two scroll containers
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll positions between top and bottom
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;
    if (!topScroll || !bottomScroll) return;

    // When top scrollbar is scrolled, update bottom
    const handleTopScroll = () => {
      if (bottomScroll.scrollLeft !== topScroll.scrollLeft) {
        bottomScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    // When bottom (main) container is scrolled, update top
    const handleBottomScroll = () => {
      if (topScroll.scrollLeft !== bottomScroll.scrollLeft) {
        topScroll.scrollLeft = bottomScroll.scrollLeft;
      }
    };

    topScroll.addEventListener("scroll", handleTopScroll);
    bottomScroll.addEventListener("scroll", handleBottomScroll);

    return () => {
      topScroll.removeEventListener("scroll", handleTopScroll);
      bottomScroll.removeEventListener("scroll", handleBottomScroll);
    };
  }, []);

  // Update the top scrollbar width to match the table's scrollable width
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;
    if (!topScroll || !bottomScroll) return;

    const updateScrollWidth = () => {
      const child = topScroll.firstElementChild as HTMLDivElement;
      if (child) {
        child.style.width = `${bottomScroll.scrollWidth}px`;
      }
    };

    updateScrollWidth();
    // Re-sync on window resize
    window.addEventListener("resize", updateScrollWidth);
    return () => window.removeEventListener("resize", updateScrollWidth);
  }, [rows, columns]);

  return (
    <div className="rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      {/* Top horizontal scrollbar */}
      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden h-4 bg-gray-50 border-b border-gray-200"
        style={{ overflowX: "auto", overflowY: "hidden" }}
      >
        {/* Invisible spacer div that mimics the table width */}
        <div style={{ height: "1px" }} />
      </div>

      {/* Main table container with vertical + horizontal scroll */}
      <div
        ref={bottomScrollRef}
        className="max-h-[600px] overflow-y-auto overflow-x-auto"
      >
        <Table className="min-w-full">
          <TableHead
            clearTheme
            className="sticky top-0 z-10 bg-gray-100 shadow-sm"
          >
            <TableRow>
              {/* S. No. column header */}
              <TableHeadCell className="w-20 px-6 py-3 font-bold text-gray-700 uppercase tracking-wider text-sm">
                S. No.
              </TableHeadCell>

              {/* Remaining headers */}
              {columns.map((col) => (
                <TableHeadCell
                  key={col.key}
                  className="px-6 py-3 font-bold text-gray-700 uppercase tracking-wider text-sm"
                >
                  {col.label}
                </TableHeadCell>
              ))}
              {actions && (
                <TableHeadCell className="px-6 py-3 font-bold text-gray-700 uppercase tracking-wider text-sm">
                  Actions
                </TableHeadCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody className="divide-y">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalHeadCols}
                  className="py-8 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-6 h-6 text-gray-400"
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
                    <span>No data available</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => {
                const serial = serialNumber(page, pageSize, index);
                return (
                  <TableRow
                    key={row.id || index}
                    className={`bg-white text-gray-800 ${
                      onRowClick ? "hover:bg-gray-100 cursor-pointer" : ""
                    } transition-colors duration-200`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {/* S. No. cell */}
                    <TableCell className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {serial}
                    </TableCell>

                    {/* Data cells */}
                    {columns.map((col) => (
                      <TableCell key={col.key} className="px-6 py-4">
                        {row[col.key]}
                      </TableCell>
                    ))}

                    {/* Actions cell */}
                    {actions && (
                      <TableCell
                        className="px-6 py-4"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

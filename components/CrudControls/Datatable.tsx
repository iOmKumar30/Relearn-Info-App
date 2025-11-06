import { serialNumber } from "@/libs/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";

type Column = { key: string; label: string };
type Row = Record<string, any>;

interface DataTableProps {
  columns: Column[];
  rows: Row[];
  actions?: (row: Row) => React.ReactNode;
  onRowClick?: (row: any) => void;
  page: number; // NEW: current page number
  pageSize: number; // NEW: rows per page
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

  return (
    <div className="rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
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

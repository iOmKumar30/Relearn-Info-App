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
}

export default function DataTable({
  columns,
  rows,
  actions,
  onRowClick,
}: DataTableProps) {
  return (
    <div className="rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
        <Table className="min-w-full">
          <TableHead
            clearTheme
            className="sticky top-0 z-10 bg-gray-100 shadow-sm"
          >
            <TableRow>
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
                  colSpan={columns.length + (actions ? 1 : 0)}
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
              rows.map((row, i) => (
                <TableRow
                  key={i}
                  className={`bg-white text-gray-800 ${
                    onRowClick ? "hover:bg-gray-100 cursor-pointer" : ""
                  } transition-colors duration-200`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className="px-6 py-4">
                      {row[col.key]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      className="px-6 py-4"
                      onClick={(e) => {
                        // prevent row navigation when clicking inside actions
                        e.stopPropagation();
                      }}
                    >
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

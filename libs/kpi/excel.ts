import * as XLSX from 'xlsx';

export function formatKpiValueForExcel(
  value: number | null,
  unit: string,
): string {
  if (value === null || value === undefined) return '—';
  if (unit === 'PERCENT') return `${(value * 100).toFixed(1)}%`;
  if (unit === 'LAKHS') return `₹${value.toFixed(2)}L`;
  return value.toLocaleString('en-IN');
}

export function exportToExcel(
  filename: string,
  sheetName: string,
  data: Record<string, any>[],
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

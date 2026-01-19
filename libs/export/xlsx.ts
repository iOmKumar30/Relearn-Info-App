import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

export type ExportColumn = {
  key: string;
  label?: string;
};

export type ExportOptions = {
  fileName: string;
  sheetName?: string;
  columns?: ExportColumn[];
  preface?: Record<string, any>[];
};

export function exportToXlsx(rows: Record<string, any>[], opts: ExportOptions) {
  const { fileName, sheetName = "Sheet1", columns, preface } = opts;

  const wb = XLSX.utils.book_new();

  // 1. Convert main data rows to cleaned objects based on columns
  const tableData = rows.map((r) => {
    const obj: Record<string, any> = {};
    if (columns && columns.length) {
      for (const col of columns) {
        obj[col.label || col.key] = toPlain(r[col.key]);
      }
    } else {
      for (const k of Object.keys(r)) {
        obj[k] = toPlain(r[k]);
      }
    }
    return obj;
  });

  // 2. Generate the Worksheet
  // If we have a preface, we need to use json_to_sheet logic manually or combine arrays
  let ws: XLSX.WorkSheet;

  if (preface && preface.length > 0) {
    // Convert preface to Array of Arrays (AOA) or JSON
    // Strategy: Create sheet from preface, then add table data with origin offset
    ws = XLSX.utils.json_to_sheet(preface, { skipHeader: false });

    // Calculate where the table should start (preface length + 2 empty lines)
    const tableOrigin = preface.length + 3;

    // Use utility to add the table data to the EXISTING sheet
    XLSX.utils.sheet_add_json(ws, tableData, {
      origin: { r: tableOrigin, c: 0 },
    });
  } else {
    ws = XLSX.utils.json_to_sheet(tableData);
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    `${fileName}.xlsx`,
  );
}

function toPlain(value: any): any {
  if (value == null) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (value instanceof Date) return value.toISOString().split("T")[0]; // Simplify dates
  try {
    return String(value);
  } catch {
    return "";
  }
}

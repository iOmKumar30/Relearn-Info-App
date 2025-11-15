import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type ExportColumn = {
  key: string;      
  label?: string;   
};

export type ExportOptions = {
  fileName: string;          
  sheetName?: string;        
  columns?: ExportColumn[]; 
};

export function exportToXlsx(rows: Record<string, any>[], opts: ExportOptions) {
  const { fileName, sheetName = "Sheet1", columns } = opts;

  const cleaned = rows.map((r) => {
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

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(cleaned);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${fileName}.xlsx`);
}

// function to convert React elements to plain text
function toPlain(value: any): any {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const text = extractText(value);
    if (text !== null) return text;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// function to extract text from a React element
function extractText(node: any): string | null {
  if (!node) return null;
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(extractText).filter((x) => x != null) as string[];
    return parts.length ? parts.join(" ") : null;
  }
  if (node.props?.children) {
    const t = extractText(node.props.children);
    return t;
  }
  return null;
}

import { ToWords } from "to-words";

export const toUTCDate = (dateStr?: string | Date): Date | undefined => {
  if (!dateStr) return undefined;

  if (dateStr instanceof Date) {
    const safeDate = new Date(dateStr.getTime() + 12 * 60 * 60 * 1000);

    const year = safeDate.getFullYear();
    const month = safeDate.getMonth();
    const day = safeDate.getDate();

    return new Date(Date.UTC(year, month, day, 13, 0, 0));
  }

  const trimmed = String(dateStr).trim();

  if (trimmed.includes("T")) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? undefined : date;
  }

  const parts = trimmed.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    return new Date(Date.UTC(year, month, day, 13, 0, 0));
  }

  return undefined;
};

export const toLocalDateInput = (dateStr: string | Date | undefined) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export function numberToWords(amount: number): string {
  const towords = new ToWords();
  let words = towords.convert(amount);
  return words.charAt(0).toUpperCase() + words.slice(1) + " only";
}

export function getFinancialYear(date: Date): string {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  if (month < 3) {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
  return `${year}-${String(year + 1).slice(-2)}`;
}

export function getMonthShort(date: Date): string {
  return date.toLocaleString("default", { month: "short" });
}

export function generateDocNumber(date: Date, serialNo: string): string {
  const fy = getFinancialYear(date);
  const month = getMonthShort(date);
  // Format: RELF/2025-26/Jan/C1
  return `RELF/${fy}/${month}/${serialNo}`;
}

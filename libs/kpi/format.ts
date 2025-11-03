import { KPIUnit } from "@prisma/client";

export function formatKpiValue(
  v: number | null | undefined,
  unit: KPIUnit
): string {
  if (v == null) return "—";
  switch (unit) {
    case "COUNT":
      return Number(v).toLocaleString("en-IN");
    case "PERCENT":
      return `${(Number(v) * 100).toFixed(1)}%`;
    case "LAKHS":
      return `₹ ${Number(v).toFixed(2)} L`;
    default:
      return String(v);
  }
}

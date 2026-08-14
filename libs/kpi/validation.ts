import { parseMonthYYYYMM } from '@/libs/kpi/month';

export type KpiMonthRange = { months: string[] } | { error: string };

export function parseKpiYear(value: unknown): number | null {
  const year = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMonthInput(value: unknown): string | null {
  return parseMonthYYYYMM(value);
}

export function parseKpiMonthRange(
  startMonth: unknown,
  endMonth: unknown,
  currentMonth: string,
  maxMonths = 12,
): KpiMonthRange {
  const start = parseMonthInput(startMonth);
  const end = parseMonthInput(endMonth);
  if (!start || !end) return { error: 'startMonth and endMonth must be strict YYYY-MM values' };
  if (start > end) return { error: 'startMonth must not be after endMonth' };
  if (end > currentMonth) return { error: 'Requested months cannot be in the future' };

  const [startYear, startIndex] = start.split('-').map(Number);
  const [endYear, endIndex] = end.split('-').map(Number);
  const count = (endYear - startYear) * 12 + (endIndex - startIndex) + 1;
  if (count > maxMonths) return { error: `A backfill can include at most ${maxMonths} months` };

  const months: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(Date.UTC(startYear, startIndex - 1 + offset, 1));
    months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return { months };
}

export function parseDateInput(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function isNonEmptyString(value: unknown, maxLength = 255): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

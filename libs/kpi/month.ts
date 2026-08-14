const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseMonthYYYYMM(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  return year >= 1900 && year <= 2100 ? value : null;
}

export function firstDayOfMonthFromYYYYMM(yyyymm: string): Date {
  const normalized = parseMonthYYYYMM(yyyymm);
  if (!normalized) throw new Error('Invalid month; expected YYYY-MM');

  const [year, month] = normalized.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function normalizeMonthDate(value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error('Invalid month date');
  }
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function nextMonthStart(monthDate: Date): Date {
  const month = normalizeMonthDate(monthDate);
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
}

export function monthYYYYMMInKolkata(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!year || !month) throw new Error('Unable to determine current month');
  return `${year}-${month}`;
}

export function currentMonthYYYYMM(): string {
  return monthYYYYMMInKolkata(new Date());
}

export function monthsBackArray(lastMonth: Date, back: number): Date[] {
  const last = normalizeMonthDate(lastMonth);
  const arr: Date[] = [];
  for (let i = back - 1; i >= 0; i--) {
    arr.push(new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - i, 1)));
  }
  return arr;
}

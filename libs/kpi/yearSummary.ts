import { firstDayOfMonthFromYYYYMM } from '@/libs/kpi/month';

export type SummaryValue = {
  month: Date;
  source: 'AUTO' | 'MANUAL';
  value: number;
};

export function getYearSummaryWindow(year: number, currentBusinessMonth: string) {
  const currentMonthStart = firstDayOfMonthFromYYYYMM(currentBusinessMonth);
  const isCurrentYear = year === currentMonthStart.getUTCFullYear();
  const calendarFrom = new Date(Date.UTC(year, 0, 1));
  const calendarToExclusive = isCurrentYear
    ? currentMonthStart
    : new Date(Date.UTC(year + 1, 0, 1));
  const fiscalFrom = new Date(Date.UTC(year, 3, 1));
  const fiscalEndExclusive = new Date(Date.UTC(year + 1, 3, 1));
  const fiscalToExclusive = isCurrentYear && currentMonthStart < fiscalEndExclusive
    ? currentMonthStart
    : fiscalEndExclusive;

  return {
    isCurrentYear,
    calendarFrom,
    calendarToExclusive,
    fiscalFrom,
    fiscalToExclusive,
    latestCompletedMonth: isCurrentYear
      ? new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1))
      : null,
  };
}

export function resolveEffectiveMonthlyValues(values: SummaryValue[]) {
  const byMonth = new Map<string, number>();
  for (const value of values) {
    if (value.source === 'AUTO') byMonth.set(value.month.toISOString().slice(0, 7), value.value);
  }
  for (const value of values) {
    if (value.source === 'MANUAL') byMonth.set(value.month.toISOString().slice(0, 7), value.value);
  }
  return Array.from(byMonth.entries())
    .map(([monthKey, value]) => ({ monthKey, value }))
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey));
}

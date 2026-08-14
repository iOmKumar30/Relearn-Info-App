import assert from 'node:assert/strict';

import { getYearSummaryWindow, resolveEffectiveMonthlyValues } from '../libs/kpi/yearSummary';

function date(month: string) {
  return new Date(`${month}-01T00:00:00.000Z`);
}

async function main() {
  const current = getYearSummaryWindow(2026, '2026-08');
  assert.equal(current.isCurrentYear, true);
  assert.equal(current.calendarToExclusive.toISOString(), '2026-08-01T00:00:00.000Z');
  assert.equal(current.fiscalToExclusive.toISOString(), '2026-08-01T00:00:00.000Z');
  assert.equal(current.latestCompletedMonth?.toISOString(), '2026-07-01T00:00:00.000Z');

  const studentsTotalValues = [
    { month: date('2026-07'), source: 'AUTO' as const, value: 692 },
    { month: date('2026-08'), source: 'AUTO' as const, value: 1 },
  ].filter((value) => value.month < current.calendarToExclusive);
  assert.equal(resolveEffectiveMonthlyValues(studentsTotalValues).at(-1)?.value, 692, 'students.total must use July, not August');

  const studentsPassedXValues = [
    { month: date('2026-07'), source: 'AUTO' as const, value: 13 },
    { month: date('2026-08'), source: 'AUTO' as const, value: 0 },
  ].filter((value) => value.month < current.calendarToExclusive);
  assert.equal(resolveEffectiveMonthlyValues(studentsPassedXValues).at(-1)?.value, 13, 'students.passed.x must use July, not August');

  const manualPrecedenceValues = [
    { month: date('2026-07'), source: 'AUTO' as const, value: 700 },
    { month: date('2026-07'), source: 'MANUAL' as const, value: 701 },
    { month: date('2026-08'), source: 'AUTO' as const, value: 1 },
  ].filter((value) => value.month < current.calendarToExclusive);
  const effectiveCurrent = resolveEffectiveMonthlyValues(manualPrecedenceValues);
  assert.deepEqual(effectiveCurrent, [{ monthKey: '2026-07', value: 701 }]);
  assert.equal(effectiveCurrent.at(-1)?.value, 701, 'July MANUAL must win and August must be excluded');

  const financeValues = [
    { month: date('2026-06'), source: 'AUTO' as const, value: 120 },
    { month: date('2026-07'), source: 'AUTO' as const, value: 150 },
    { month: date('2026-08'), source: 'AUTO' as const, value: 180 },
  ].filter((value) => value.month < current.fiscalToExclusive);
  assert.equal(resolveEffectiveMonthlyValues(financeValues).at(-1)?.value, 150, 'finance must use July cumulative snapshot');

  const percentageValues = [
    { month: date('2026-06'), source: 'AUTO' as const, value: 0.4 },
    { month: date('2026-07'), source: 'AUTO' as const, value: 0.6 },
    { month: date('2026-08'), source: 'AUTO' as const, value: 1 },
  ].filter((value) => value.month < current.calendarToExclusive);
  const percentageAverage = resolveEffectiveMonthlyValues(percentageValues).reduce((sum, value) => sum + value.value, 0) / 2;
  assert.equal(percentageAverage, 0.5, 'August must be excluded from the percentage average');

  const past = getYearSummaryWindow(2025, '2026-08');
  assert.equal(past.isCurrentYear, false);
  assert.equal(past.calendarToExclusive.toISOString(), '2026-01-01T00:00:00.000Z');
  const pastValues = resolveEffectiveMonthlyValues([
    { month: date('2025-11'), source: 'AUTO', value: 10 },
    { month: date('2025-12'), source: 'AUTO', value: 12 },
  ]);
  assert.equal(pastValues.at(-1)?.monthKey, '2025-12');
  console.log('KPI yearly summary selection verification passed.');
}

main().catch((error) => {
  console.error('KPI yearly summary selection verification failed', error);
  process.exitCode = 1;
});

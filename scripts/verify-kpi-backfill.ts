import assert from 'node:assert/strict';
import 'dotenv/config';

import { runKpiBackfillMonth } from '../libs/kpi/backfill';
import { firstDayOfMonthFromYYYYMM, monthYYYYMMInKolkata, normalizeMonthDate } from '../libs/kpi/month';
import { parseKpiMonthRange, parseMonthInput } from '../libs/kpi/validation';
import prisma from '../libs/prismadb';

async function main() {
  assert.equal(parseMonthInput('2026-01'), '2026-01');
  assert.equal(parseMonthInput('2026-1'), null);
  assert.equal(parseMonthInput('2026-13'), null);
  assert.deepEqual(parseKpiMonthRange('2026-01', '2026-03', '2026-08'), { months: ['2026-01', '2026-02', '2026-03'] });
  assert.ok('error' in parseKpiMonthRange('2026-03', '2026-01', '2026-08'));
  assert.ok('error' in parseKpiMonthRange('2026-01', '2026-09', '2026-08'));
  assert.equal(monthYYYYMMInKolkata(new Date('2026-08-31T18:31:00.000Z')), '2026-09');
  assert.equal(monthYYYYMMInKolkata(new Date('2026-08-31T18:29:00.000Z')), '2026-08');
  assert.equal(normalizeMonthDate(new Date('2026-08-31T18:00:00.000Z')).toISOString(), '2026-08-01T00:00:00.000Z');
  assert.equal(firstDayOfMonthFromYYYYMM('2026-01').toISOString(), '2026-01-01T00:00:00.000Z');

  const beforeValues = await prisma.kPIMonthlyValue.count();
  const beforeJobs = await prisma.kpiJobQueue.count();
  const dryRun = await runKpiBackfillMonth({ targetMonth: '2026-04', actorId: 'verification', dryRun: true });
  assert.equal(dryRun.status, 'dry-run');
  assert.ok(dryRun.skippedKpis.some((kpi) => kpi.key === 'projects.ongoing'));
  assert.ok(dryRun.skippedKpis.some((kpi) => kpi.key === 'projects.past'));
  assert.equal(await prisma.kPIMonthlyValue.count(), beforeValues, 'dry run must not write KPI values');
  assert.equal(await prisma.kpiJobQueue.count(), beforeJobs, 'dry run must not mutate queue rows');

  const [coverage, aprilEntrepreneurs, manualPairs] = await Promise.all([
    prisma.kPIMonthlyValue.groupBy({ by: ['month'], where: { month: { gte: new Date('2026-01-01T00:00:00.000Z'), lt: new Date('2026-09-01T00:00:00.000Z') } }, _count: { id: true } }),
    prisma.kPIMonthlyValue.findMany({ where: { month: new Date('2026-04-01T00:00:00.000Z'), kpi: { key: 'entrepreneurs.created' } }, select: { source: true, value: true } }),
    prisma.kPIMonthlyValue.findMany({ where: { source: 'MANUAL' }, select: { kpiId: true, month: true, value: true } }),
  ]);
  console.table(coverage.map((row) => ({ month: row.month.toISOString().slice(0, 7), rows: row._count.id })));
  console.log({ aprilEntrepreneurs, manualRowsObserved: manualPairs.length });
  console.log('KPI backfill verification passed. Review coverage and API backfill results for computed/failed months.');
}

main().catch((error) => {
  console.error('KPI backfill verification failed', error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());

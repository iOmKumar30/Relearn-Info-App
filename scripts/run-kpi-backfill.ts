import 'dotenv/config';

import { isAdmin } from '../libs/isAdmin';
import { runKpiBackfillMonth } from '../libs/kpi/backfill';
import { currentMonthYYYYMM } from '../libs/kpi/month';
import { parseKpiMonthRange } from '../libs/kpi/validation';
import prisma from '../libs/prismadb';

function parseArgs(args: string[]) {
  const startIndex = args.indexOf('--start-month');
  const endIndex = args.indexOf('--end-month');
  const actorIndex = args.indexOf('--actor-id');
  return {
    startMonth: startIndex >= 0 ? args[startIndex + 1] : undefined,
    endMonth: endIndex >= 0 ? args[endIndex + 1] : undefined,
    actorId: actorIndex >= 0 ? args[actorIndex + 1] : undefined,
    dryRun: args.includes('--dry-run'),
  };
}

async function main() {
  const { startMonth, endMonth, actorId, dryRun } = parseArgs(process.argv.slice(2));
  if (!actorId || !(await isAdmin(actorId))) throw new Error('An active ADMIN actor ID is required');
  const range = parseKpiMonthRange(startMonth, endMonth, currentMonthYYYYMM(), 12);
  if ('error' in range) throw new Error(range.error);

  const financialYears = await prisma.financialYear.findMany({ select: { startDate: true, endDate: true }, orderBy: { startDate: 'asc' } });
  let latestEnd: Date | null = null;
  for (const year of financialYears) {
    if (latestEnd && year.startDate <= latestEnd) throw new Error('Financial year overlap must be resolved before KPI backfill');
    if (!latestEnd || year.endDate > latestEnd) latestEnd = year.endDate;
  }

  const results = [];
  for (const targetMonth of range.months) {
    try {
      results.push(await runKpiBackfillMonth({ targetMonth, actorId, dryRun }));
    } catch (error) {
      console.error('[KPI_BACKFILL] Month failed before completion', { actorId, targetMonth, error: String(error) });
      results.push({ month: targetMonth, status: 'failed', autoKpisWritten: [], skippedKpis: [], failedKpis: ['month'] });
    }
  }
  console.table(results.map((result) => ({ month: result.month, status: result.status, autoWritten: result.autoKpisWritten.length, skipped: result.skippedKpis.map((kpi) => kpi.key).join(', '), failed: result.failedKpis.join(', ') })));
  if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
}

main().catch((error) => {
  console.error('KPI backfill command failed', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());

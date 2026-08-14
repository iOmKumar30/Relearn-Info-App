import {
  computeCentresTotal,
  computeClassroomsTotal,
  computeFinances,
  computeMonthlyFinances,
  computeMembersTotal,
  computePersonsTrained,
  computeSeniorShare,
  computeStudentsPassedX,
  computeStudentsTotal,
  computeTutorsTotal,
  upsertAuto,
} from '@/libs/kpi/compute';
import { firstDayOfMonthFromYYYYMM } from '@/libs/kpi/month';
import prisma from '@/libs/prismadb';

const STALE_PROCESSING_MS = 15 * 60 * 1000;

// These are the only project KPIs whose existing calculation depends on mutable
// Project.status. Historical backfill must never regenerate them.
export const HISTORICAL_PROJECT_KPI_KEYS = new Set([
  'projects.ongoing',
  'projects.past',
]);

export const HISTORICAL_KPI_SKIP_REASONS: Record<string, string> = {
  'projects.ongoing': 'Historical project lifecycle data is unavailable',
  'projects.past': 'Historical project lifecycle data is unavailable',
  'entrepreneurs.created': 'No approved historical compute handler',
};

export function historicalKpiSkipReason(key: string): string | null {
  return HISTORICAL_KPI_SKIP_REASONS[key] ?? null;
}

const SUPPORTED_KPI_KEYS = new Set([
  'students.total',
  'classrooms.total',
  'classrooms.senior.share',
  'students.passed.x',
  'tutors.total',
  'members.total',
  'persons.trained',
  'centres.total',
  'finance.revenue.current.lakhs',
  'finance.expenditure.current.lakhs',
  'finance.revenue.past.lakhs',
  'finance.expenditure.past.lakhs',
  'finance.revenue.monthly.lakhs',
  'finance.expenditure.monthly.lakhs',
]);

export type BackfillMonthResult = {
  month: string;
  status: 'dry-run' | 'computed' | 'queued' | 'failed';
  autoKpisWritten: string[];
  skippedKpis: Array<{ key: string; reason: string }>;
  failedKpis: string[];
};

async function claimBackfillJob(targetMonth: string) {
  let job = await prisma.kpiJobQueue.findUnique({ where: { targetMonth } });
  if (!job) {
    try {
      job = await prisma.kpiJobQueue.create({ data: { targetMonth, status: 'PENDING' } });
    } catch {
      job = await prisma.kpiJobQueue.findUnique({ where: { targetMonth } });
      if (!job) throw new Error('Unable to initialize KPI backfill job');
    }
  }

  const claimed = await prisma.kpiJobQueue.updateMany({
    where: { id: job.id, status: { in: ['PENDING', 'COMPLETED', 'FAILED'] } },
    data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count === 1) return { id: job.id, claimed: true };

  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
  const reclaimed = await prisma.kpiJobQueue.updateMany({
    where: { id: job.id, status: 'PROCESSING', updatedAt: { lt: staleBefore } },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
      lastError: 'Recovered stale KPI job lease for admin backfill',
    },
  });
  return { id: job.id, claimed: reclaimed.count === 1 };
}

async function writeComputedAuto(
  key: string,
  kpiId: string,
  monthDate: Date,
  finance: Awaited<ReturnType<typeof computeFinances>> | null,
  monthlyFinance: Awaited<ReturnType<typeof computeMonthlyFinances>> | null,
) {
  switch (key) {
    case 'students.total': return upsertAuto(kpiId, monthDate, await computeStudentsTotal(monthDate));
    case 'classrooms.total': return upsertAuto(kpiId, monthDate, await computeClassroomsTotal(monthDate));
    case 'classrooms.senior.share': return upsertAuto(kpiId, monthDate, await computeSeniorShare(monthDate));
    case 'students.passed.x': return upsertAuto(kpiId, monthDate, await computeStudentsPassedX(monthDate));
    case 'tutors.total': return upsertAuto(kpiId, monthDate, await computeTutorsTotal(monthDate));
    case 'members.total': return upsertAuto(kpiId, monthDate, await computeMembersTotal(monthDate));
    case 'persons.trained': return upsertAuto(kpiId, monthDate, await computePersonsTrained(monthDate));
    case 'centres.total': return upsertAuto(kpiId, monthDate, await computeCentresTotal(monthDate));
    case 'finance.revenue.current.lakhs': return upsertAuto(kpiId, monthDate, finance!.currentRevenue);
    case 'finance.expenditure.current.lakhs': return upsertAuto(kpiId, monthDate, finance!.currentExpenditure);
    case 'finance.revenue.past.lakhs': return upsertAuto(kpiId, monthDate, finance!.pastRevenue);
    case 'finance.expenditure.past.lakhs': return upsertAuto(kpiId, monthDate, finance!.pastExpenditure);
    case 'finance.revenue.monthly.lakhs': return upsertAuto(kpiId, monthDate, monthlyFinance!.revenue);
    case 'finance.expenditure.monthly.lakhs': return upsertAuto(kpiId, monthDate, monthlyFinance!.expenditure);
    default: throw new Error(`Unsupported KPI key: ${key}`);
  }
}

export async function runKpiBackfillMonth({
  targetMonth,
  actorId,
  dryRun,
}: {
  targetMonth: string;
  actorId: string;
  dryRun: boolean;
}): Promise<BackfillMonthResult> {
  const monthDate = firstDayOfMonthFromYYYYMM(targetMonth);
  const definitions = await prisma.kPI.findMany({ where: { active: true }, select: { id: true, key: true } });
  const skippedKpis = definitions
    .filter((kpi) => HISTORICAL_PROJECT_KPI_KEYS.has(kpi.key) || !SUPPORTED_KPI_KEYS.has(kpi.key))
    .map((kpi) => ({
      key: kpi.key,
      reason: historicalKpiSkipReason(kpi.key) ?? 'No approved AUTO compute handler exists for this KPI key',
    }));
  const eligible = definitions.filter((kpi) => SUPPORTED_KPI_KEYS.has(kpi.key));

  if (dryRun) {
    console.info('[KPI_BACKFILL]', { action: 'dry-run', actorId, targetMonth, eligibleKpis: eligible.map((kpi) => kpi.key), skippedKpis });
    return { month: targetMonth, status: 'dry-run', autoKpisWritten: eligible.map((kpi) => kpi.key), skippedKpis, failedKpis: [] };
  }

  const claim = await claimBackfillJob(targetMonth);
  if (!claim.claimed) {
    console.info('[KPI_BACKFILL]', { action: 'queue-locked', actorId, targetMonth });
    return { month: targetMonth, status: 'queued', autoKpisWritten: [], skippedKpis, failedKpis: [] };
  }

  const autoKpisWritten: string[] = [];
  const failedKpis: string[] = [];
  let finance: Awaited<ReturnType<typeof computeFinances>> | null = null;
  let financeError = false;
  const hasFiscalFinance = eligible.some((kpi) => [
    'finance.revenue.current.lakhs',
    'finance.expenditure.current.lakhs',
    'finance.revenue.past.lakhs',
    'finance.expenditure.past.lakhs',
  ].includes(kpi.key));
  if (hasFiscalFinance) {
    try {
      finance = await computeFinances(monthDate);
    } catch (error) {
      financeError = true;
      console.error('[KPI_BACKFILL] Finance computation failed', { actorId, targetMonth, error: String(error) });
    }
  }

  let monthlyFinance: Awaited<ReturnType<typeof computeMonthlyFinances>> | null = null;
  let monthlyFinanceError = false;
  const hasMonthlyFinance = eligible.some((kpi) => [
    'finance.revenue.monthly.lakhs',
    'finance.expenditure.monthly.lakhs',
  ].includes(kpi.key));
  if (hasMonthlyFinance) {
    try {
      monthlyFinance = await computeMonthlyFinances(monthDate);
    } catch (error) {
      monthlyFinanceError = true;
      console.error('[KPI_BACKFILL] Monthly finance computation failed', { actorId, targetMonth, error: String(error) });
    }
  }

  for (const kpi of eligible) {
    try {
      if (hasFiscalFinance && [
        'finance.revenue.current.lakhs',
        'finance.expenditure.current.lakhs',
        'finance.revenue.past.lakhs',
        'finance.expenditure.past.lakhs',
      ].includes(kpi.key) && financeError) throw new Error('Fiscal finance computation failed');
      if (hasMonthlyFinance && [
        'finance.revenue.monthly.lakhs',
        'finance.expenditure.monthly.lakhs',
      ].includes(kpi.key) && monthlyFinanceError) throw new Error('Monthly finance computation failed');
      await writeComputedAuto(kpi.key, kpi.id, monthDate, finance, monthlyFinance);
      autoKpisWritten.push(kpi.key);
    } catch (error) {
      failedKpis.push(kpi.key);
      console.error('[KPI_BACKFILL] KPI computation failed', { actorId, targetMonth, key: kpi.key, error: String(error) });
    }
  }

  const status = failedKpis.length > 0 ? 'FAILED' : 'COMPLETED';
  await prisma.kpiJobQueue.update({
    where: { id: claim.id },
    data: { status, lastError: failedKpis.length ? `Backfill failed KPI keys: ${failedKpis.join(', ')}` : null },
  });
  console.info('[KPI_BACKFILL]', { action: 'completed', actorId, targetMonth, outcome: status, autoKpisWritten, skippedKpis, failedKpis });

  return { month: targetMonth, status: failedKpis.length ? 'failed' : 'computed', autoKpisWritten, skippedKpis, failedKpis };
}

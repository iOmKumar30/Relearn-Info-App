import {
  computeCentresTotal,
  computeClassroomsTotal,
  computeFinances,
  computeMonthlyFinances,
  computeMembersTotal,
  computePersonsTrained,
  computeProjectsOngoing,
  computeProjectsPast,
  computeSeniorShare,
  computeStudentsPassedX,
  computeStudentsTotal,
  computeTutorsTotal,
  upsertAuto,
} from '@/libs/kpi/compute';
import {
  currentMonthYYYYMM,
  firstDayOfMonthFromYYYYMM,
} from '@/libs/kpi/month';
import prisma from '@/libs/prismadb';
import { schedules, task } from '@trigger.dev/sdk/v3';

// Trigger tasks are capped at five minutes. A fifteen-minute lease protects against
// crashes without reclaiming a normally running task.
const STALE_PROCESSING_MS = 15 * 60 * 1000;

async function claimKpiTask(targetMonth: string): Promise<{ id: string; claimed: boolean }> {
  let job = await prisma.kpiJobQueue.findUnique({ where: { targetMonth } });
  if (!job) {
    try {
      job = await prisma.kpiJobQueue.create({ data: { targetMonth, status: 'PROCESSING', attempts: 1 } });
      return { id: job.id, claimed: true };
    } catch {
      job = await prisma.kpiJobQueue.findUnique({ where: { targetMonth } });
      if (!job) throw new Error('Unable to create KPI job');
    }
  }
  const claimed = await prisma.kpiJobQueue.updateMany({
    where: { id: job.id, status: { not: 'PROCESSING' } },
    data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count === 1) return { id: job.id, claimed: true };

  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
  const recovered = await prisma.kpiJobQueue.updateMany({
    where: { id: job.id, status: 'PROCESSING', updatedAt: { lt: staleBefore } },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
      lastError: 'Recovered stale KPI job lease',
    },
  });
  return { id: job.id, claimed: recovered.count === 1 };
}

export const updateKpisTask = task({
  id: 'update-kpis',
  maxDuration: 300,
  run: async (payload: { monthStr?: string }) => {
    const monthStr = payload.monthStr || currentMonthYYYYMM();
    const monthDate = firstDayOfMonthFromYYYYMM(monthStr);
    const isHistoricalMonth = monthStr < currentMonthYYYYMM();
    let jobId: string | null = null;

    try {
      const claim = await claimKpiTask(monthStr);
      jobId = claim.id;
      if (!claim.claimed) {
        return { success: true, message: 'KPI job already processing', month: monthStr };
      }

      console.log(`[TRIGGER.DEV] Starting background KPI update for ${monthStr}`);

      const defs = await prisma.kPI.findMany({
      where: { active: true },
    });

      const finances = await computeFinances(monthDate);
      const monthlyFinances = defs.some((definition) => [
        'finance.revenue.monthly.lakhs',
        'finance.expenditure.monthly.lakhs',
      ].includes(definition.key))
        ? await computeMonthlyFinances(monthDate)
        : null;

      let updated = 0;
      const failed: string[] = [];
      const skipped: string[] = [];

      for (const k of defs) {
      try {
        switch (k.key) {
          case 'students.total':
            await upsertAuto(
              k.id,
              monthDate,
              await computeStudentsTotal(monthDate),
            );
            break;

          case 'classrooms.total':
            await upsertAuto(
              k.id,
              monthDate,
              await computeClassroomsTotal(monthDate),
            );
            break;

          case 'classrooms.senior.share':
            await upsertAuto(
              k.id,
              monthDate,
              await computeSeniorShare(monthDate),
            );
            break;

          case 'students.passed.x':
            await upsertAuto(
              k.id,
              monthDate,
              await computeStudentsPassedX(monthDate),
            );
            break;

          case 'tutors.total':
            await upsertAuto(
              k.id,
              monthDate,
              await computeTutorsTotal(monthDate),
            );
            break;

          case 'members.total':
            await upsertAuto(
              k.id,
              monthDate,
              await computeMembersTotal(monthDate),
            );
            break;

          case 'persons.trained':
            await upsertAuto(
              k.id,
              monthDate,
              await computePersonsTrained(monthDate),
            );
            break;

          case 'projects.ongoing':
            if (isHistoricalMonth) {
              // Project status is mutable and there is no lifecycle history. Preserve
              // existing historical AUTO snapshots rather than replacing them with an
              // approximation based on today's status.
              skipped.push(k.key);
              console.warn('[TRIGGER.DEV] Skipped approximate historical project KPI recomputation', { month: monthStr, key: k.key });
              continue;
            }
            await upsertAuto(
              k.id,
              monthDate,
              await computeProjectsOngoing(monthDate),
            );
            break;

          case 'projects.past':
            if (isHistoricalMonth) {
              skipped.push(k.key);
              console.warn('[TRIGGER.DEV] Skipped approximate historical project KPI recomputation', { month: monthStr, key: k.key });
              continue;
            }
            await upsertAuto(
              k.id,
              monthDate,
              await computeProjectsPast(monthDate),
            );
            break;

          case 'centres.total':
            await upsertAuto(
              k.id,
              monthDate,
              await computeCentresTotal(monthDate),
            );
            break;

          case 'finance.revenue.current.lakhs':
            await upsertAuto(k.id, monthDate, finances.currentRevenue);
            break;

          case 'finance.expenditure.current.lakhs':
            await upsertAuto(k.id, monthDate, finances.currentExpenditure);
            break;

          case 'finance.revenue.past.lakhs':
            await upsertAuto(k.id, monthDate, finances.pastRevenue);
            break;

          case 'finance.expenditure.past.lakhs':
            await upsertAuto(k.id, monthDate, finances.pastExpenditure);
            break;

          case 'finance.revenue.monthly.lakhs':
            await upsertAuto(k.id, monthDate, monthlyFinances!.revenue);
            break;

          case 'finance.expenditure.monthly.lakhs':
            await upsertAuto(k.id, monthDate, monthlyFinances!.expenditure);
            break;

          default:
            console.warn(
              `[TRIGGER.DEV] No compute handler found for KPI: ${k.key}`,
            );
            continue;
        }

        updated++;
      } catch (error) {
        failed.push(k.key);
        console.error(`[TRIGGER.DEV] Failed KPI update for ${k.key}`, error);
      }
    }

      if (failed.length > 0) {
        await prisma.kpiJobQueue.update({ where: { id: jobId }, data: { status: 'FAILED', lastError: `Failed KPIs: ${failed.join(', ')}` } });
        throw new Error(`KPI update failed for: ${failed.join(', ')}`);
      }
      await prisma.kpiJobQueue.update({ where: { id: jobId }, data: { status: 'COMPLETED', lastError: null } });
      return { success: true, updatedKPIs: updated, failedKPIs: [], skippedKPIs: skipped, month: monthStr };
    } catch (error) {
      if (jobId) {
        await prisma.kpiJobQueue.update({ where: { id: jobId }, data: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'Unknown KPI task failure' } }).catch(() => undefined);
      }
      throw error;
    }
  },
});
// Refreshes the current month's live values every day at 2:00 AM.
export const dailyKpiSchedule = schedules.task({
  id: 'daily-kpi-update',
  // Trigger.dev v3.3 schedules cron expressions in UTC. 20:30 UTC is 02:00 IST.
  cron: '30 20 * * *',
  run: async () => {
    console.log('[TRIGGER.DEV] Daily KPI update schedule triggered.');

    await updateKpisTask.trigger({
      monthStr: currentMonthYYYYMM(),
    });
  },
});

import {
  computeCentresTotal,
  computeClassroomsTotal,
  computeFinances,
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

export const updateKpisTask = task({
  id: 'update-kpis',
  maxDuration: 300,
  run: async (payload: { monthStr?: string }) => {
    const monthStr = payload.monthStr || currentMonthYYYYMM();
    const monthDate = firstDayOfMonthFromYYYYMM(monthStr);

    console.log(`[TRIGGER.DEV] Starting background KPI update for ${monthStr}`);

    const defs = await prisma.kPI.findMany({
      where: { active: true },
    });

    const finances = await computeFinances(monthDate);

    let updated = 0;
    const failed: string[] = [];

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
            await upsertAuto(
              k.id,
              monthDate,
              await computeProjectsOngoing(monthDate),
            );
            break;

          case 'projects.past':
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

    return {
      success: failed.length === 0,
      updatedKPIs: updated,
      failedKPIs: failed,
      month: monthStr,
    };
  },
});

// Refreshes the current month's live values every day at 2:00 AM.
export const dailyKpiSchedule = schedules.task({
  id: 'daily-kpi-update',
  cron: '0 2 * * *',
  run: async () => {
    console.log('[TRIGGER.DEV] Daily KPI update schedule triggered.');

    await updateKpisTask.trigger({
      monthStr: currentMonthYYYYMM(),
    });
  },
});

// Creates/refreshes the new month's KPI snapshot at 2:00 AM on day 1.
export const monthlyKpiSchedule = schedules.task({
  id: 'monthly-kpi-snapshot',
  cron: '0 2 1 * *',
  run: async () => {
    console.log('[TRIGGER.DEV] Monthly KPI snapshot schedule triggered.');

    await updateKpisTask.trigger({
      monthStr: currentMonthYYYYMM(),
    });
  },
});

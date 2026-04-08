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
} from "@/libs/kpi/compute";
import {
  currentMonthYYYYMM,
  firstDayOfMonthFromYYYYMM,
} from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";
import { schedules, task } from "@trigger.dev/sdk/v3";

// 1. The main task that does the heavy database lifting
export const updateKpisTask = task({
  id: "update-kpis",
  maxDuration: 300, // 5 minutes max runtime
  run: async (payload: { monthStr?: string }) => {
    const monthStr = payload.monthStr || currentMonthYYYYMM();
    const monthDate = firstDayOfMonthFromYYYYMM(monthStr);

    console.log(`[TRIGGER.DEV] Starting background KPI update for ${monthStr}`);

    const defs = await prisma.kPI.findMany({ where: { active: true } });
    const finances = await computeFinances();

    let updated = 0;

    for (const k of defs) {
      try {
        switch (k.key) {
          case "students.total":
            await upsertAuto(k.id, monthDate, await computeStudentsTotal());
            break;
          case "classrooms.total":
            await upsertAuto(k.id, monthDate, await computeClassroomsTotal());
            break;
          case "classrooms.senior.share":
            await upsertAuto(k.id, monthDate, await computeSeniorShare());
            break;
          case "students.passed.x":
            await upsertAuto(k.id, monthDate, await computeStudentsPassedX());
            break;
          case "tutors.total":
            await upsertAuto(k.id, monthDate, await computeTutorsTotal());
            break;
          case "members.total":
            await upsertAuto(k.id, monthDate, await computeMembersTotal());
            break;
          case "persons.trained":
            await upsertAuto(k.id, monthDate, await computePersonsTrained());
            break;
          case "projects.ongoing":
            await upsertAuto(k.id, monthDate, await computeProjectsOngoing());
            break;
          case "projects.past":
            await upsertAuto(k.id, monthDate, await computeProjectsPast());
            break;
          case "centres.total":
            await upsertAuto(k.id, monthDate, await computeCentresTotal());
            break;
          case "finance.revenue.current.lakhs":
            await upsertAuto(k.id, monthDate, finances.currentRevenue);
            break;
          case "finance.expenditure.current.lakhs":
            await upsertAuto(k.id, monthDate, finances.currentExpenditure);
            break;
          case "finance.revenue.past.lakhs":
            await upsertAuto(k.id, monthDate, finances.pastRevenue);
            break;
          case "finance.expenditure.past.lakhs":
            await upsertAuto(k.id, monthDate, finances.pastExpenditure);
            break;
        }
        updated++;
      } catch (e) {
        console.error(`[ERROR] Failed KPI: ${k.key}`, e);
      }
    }

    return { success: true, updatedKPIs: updated, month: monthStr };
  },
});

// 2. The automated nightly cron schedule
export const dailyKpiSchedule = schedules.task({
  id: "daily-kpi-update",
  cron: "0 2 * * *", // Runs every day at 2:00 AM 
  run: async (payload) => {
    console.log(
      "[TRIGGER.DEV] Scheduled cron job running, triggering main KPI task...",
    );

    // Trigger the main task from within the scheduled task
    await updateKpisTask.trigger({
      monthStr: currentMonthYYYYMM(),
    });
  },
});

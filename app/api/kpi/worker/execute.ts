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
import { firstDayOfMonthFromYYYYMM } from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";

export async function executeWorkerJob() {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[INFO] KPI Worker started`, { requestId });

  try {
    const pendingJob = await prisma.kpiJobQueue.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (!pendingJob) {
      console.log(`[INFO] No pending jobs found`);
      return { success: true, message: "Queue empty" };
    }

    let activeJob;
    try {
      activeJob = await prisma.kpiJobQueue.update({
        where: { id: pendingJob.id, status: "PENDING" },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });
    } catch (lockError) {
      console.log(`[INFO] Job locked by another worker`);
      return { success: true, message: "Job locked" };
    }

    const monthDate = firstDayOfMonthFromYYYYMM(activeJob.targetMonth);
    const defs = await prisma.kPI.findMany({ where: { active: true } });

    let updatedKPIs = 0;
    const finances = await computeFinances();

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
        updatedKPIs++;
      } catch (e) {
        console.error(`[ERROR] Failed KPI: ${k.key}`, e);
      }
    }

    await prisma.kpiJobQueue.update({
      where: { id: activeJob.id },
      data: { status: "COMPLETED" },
    });

    console.log(`[INFO] KPI Job completed successfully`, { updatedKPIs });
    return { success: true, updatedKPIs };
  } catch (error) {
    console.error(`[ERROR] Worker fatal error`, error);
    return { success: false, error: String(error) };
  }
}

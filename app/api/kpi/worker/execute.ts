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
import { currentMonthYYYYMM, firstDayOfMonthFromYYYYMM } from '@/libs/kpi/month';
import prisma from '@/libs/prismadb';

const STALE_PROCESSING_MS = 15 * 60 * 1000;

export async function executeWorkerJob() {
  const requestId = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 11)}`;

  console.log('[INFO] KPI worker started', { requestId });

  let activeJobId: string | null = null;

  try {
    // A crashed process cannot update its queue row. Requeue only jobs older than
    // the Trigger task's maximum duration, then claim them with the usual lock.
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const recovered = await prisma.kpiJobQueue.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: staleBefore } },
      data: { status: 'PENDING', lastError: 'Recovered stale KPI job lease' },
    });
    if (recovered.count > 0) {
      console.warn('[WARN] Requeued stale KPI jobs', { requestId, count: recovered.count });
    }

    const pendingJob = await prisma.kpiJobQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!pendingJob) {
      console.log('[INFO] No pending KPI jobs found', { requestId });
      return { success: true, message: 'Queue empty' };
    }

    const claim = await prisma.kpiJobQueue.updateMany({
      where: { id: pendingJob.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
    });
    if (claim.count !== 1) {
      console.log('[INFO] KPI job was claimed by another worker', {
        requestId,
        jobId: pendingJob.id,
      });

      return { success: true, message: 'Job locked' };
    }

    const activeJob = await prisma.kpiJobQueue.findUniqueOrThrow({ where: { id: pendingJob.id } });

    activeJobId = activeJob.id;

    const monthDate = firstDayOfMonthFromYYYYMM(activeJob.targetMonth);
    const isHistoricalMonth = activeJob.targetMonth < currentMonthYYYYMM();

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

    let updatedKPIs = 0;
    const failedKPIs: string[] = [];
    const skippedKPIs: string[] = [];

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
              skippedKPIs.push(k.key);
              console.warn('[WARN] Skipped approximate historical project KPI recomputation', { requestId, month: activeJob.targetMonth, key: k.key });
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
              skippedKPIs.push(k.key);
              console.warn('[WARN] Skipped approximate historical project KPI recomputation', { requestId, month: activeJob.targetMonth, key: k.key });
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
            console.warn('[WARN] No compute handler for KPI', {
              requestId,
              key: k.key,
            });
            continue;
        }

        updatedKPIs++;
      } catch (error) {
        failedKPIs.push(k.key);

        console.error('[ERROR] Failed KPI worker computation', {
          requestId,
          key: k.key,
          month: activeJob.targetMonth,
          error: String(error),
        });
      }
    }

    const completedWithFailures = failedKPIs.length > 0;

    await prisma.kpiJobQueue.update({
      where: { id: activeJob.id },
      data: {
        status: completedWithFailures ? 'FAILED' : 'COMPLETED',
        lastError: completedWithFailures
          ? `Failed KPIs: ${failedKPIs.join(', ')}`
          : null,
      },
    });

    console.log('[INFO] KPI worker completed', {
      requestId,
      jobId: activeJob.id,
      month: activeJob.targetMonth,
      updatedKPIs,
      failedKPIs,
      skippedKPIs,
    });

    return {
      success: !completedWithFailures,
      updatedKPIs,
      failedKPIs,
      skippedKPIs,
      month: activeJob.targetMonth,
    };
  } catch (error) {
    const errorMessage = String(error);

    console.error('[ERROR] KPI worker fatal error', {
      requestId,
      jobId: activeJobId,
      error: errorMessage,
    });

    if (activeJobId) {
      await prisma.kpiJobQueue.update({
        where: { id: activeJobId },
        data: {
          status: 'FAILED',
          lastError: errorMessage,
        },
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

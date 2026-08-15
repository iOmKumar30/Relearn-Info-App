import prisma from '@/libs/prismadb';
import type { Prisma } from '@prisma/client';
import { nextMonthStart, normalizeMonthDate } from '@/libs/kpi/month';
import { projectYearIncludes } from '@/libs/kpi/projectYear';

export { projectYearIncludes } from '@/libs/kpi/projectYear';

const KPI_COMPUTATION_TIMEOUT = 30_000;

type AttendanceAggregateClient = {
  monthlyClassroomAttendance: {
    aggregate(args: {
      where: { year: number; month: number };
      _sum: { totalStudentsEnrolled: true };
    }): Promise<{ _sum: { totalStudentsEnrolled: number | null } }>;
  };
};

type LegacyBoardResultClient = {
  legacyBoardResult: {
    count(args: { where: { passingYear: number } }): Promise<number>;
  };
};

type MonthlyFinanceAggregateClient = {
  transaction: {
    aggregate(args: {
      where: {
        type: 'CREDIT' | 'DEBIT';
        statement: { year: number; month: number };
      };
      _sum: { amount: true };
    }): Promise<{ _sum: { amount: unknown } }>;
  };
};

type InternCountClient = {
  intern: {
    count(args: { where: Prisma.InternWhereInput }): Promise<number>;
  };
};

type AutoValueClient = Pick<typeof prisma, 'kPIMonthlyValue'>;

export function logOperation(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
  const logEntry = { timestamp: new Date().toISOString(), level, message, ...meta };
  if (level === 'error') console.error(JSON.stringify(logEntry));
  else if (level === 'warn') console.warn(JSON.stringify(logEntry));
  else console.log(JSON.stringify(logEntry));
}

// This bounds how long callers wait; Prisma queries themselves are not cancellable by Promise.race.
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function monthWindow(monthDate: Date) {
  const start = normalizeMonthDate(monthDate);
  return { start, endExclusive: nextMonthStart(start) };
}

async function computeProjectCount(monthDate: Date, status: 'ONGOING' | 'COMPLETED'): Promise<number> {
  // Project has only mutable status plus a year string, not lifecycle events. This
  // is suitable for the live month only; historical recomputation is intentionally
  // skipped by the queue so existing AUTO snapshots remain legacy records.
  const targetYear = normalizeMonthDate(monthDate).getUTCFullYear();
  const projects = await withTimeout(
    prisma.project.findMany({ where: { status }, select: { year: true } }),
    KPI_COMPUTATION_TIMEOUT,
  );
  return projects.filter((project) => projectYearIncludes(project.year, targetYear)).length;
}

export async function computeStudentsTotal(
  monthDate: Date,
  client: AttendanceAggregateClient = prisma,
): Promise<number> {
  // Reported enrolled students from submitted monthly classroom attendance for
  // the requested KPI month. Missing/null attendance contributes zero.
  const targetMonth = normalizeMonthDate(monthDate);
  const aggregate = await withTimeout(client.monthlyClassroomAttendance.aggregate({
    where: {
      year: targetMonth.getUTCFullYear(),
      month: targetMonth.getUTCMonth() + 1,
    },
    _sum: { totalStudentsEnrolled: true },
  }), KPI_COMPUTATION_TIMEOUT);
  const total = Number(aggregate._sum.totalStudentsEnrolled ?? 0);
  if (!Number.isFinite(total)) throw new Error('Invalid reported student enrollment total');
  return total;
}

export async function computeTutorsTotal(monthDate: Date): Promise<number> {
  const { start, endExclusive } = monthWindow(monthDate);
  return withTimeout(prisma.user.count({
    where: {
      status: "ACTIVE",
      roleHistory: {
        some: {
          role: { name: "TUTOR" },
          startDate: { lt: endExclusive },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
      },
      tutorAssignments: {
        some: {
          startDate: { lt: endExclusive },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
      },
    },
  }), KPI_COMPUTATION_TIMEOUT);
}

function classroomWindowFilter(monthDate: Date) {
  const { start, endExclusive } = monthWindow(monthDate);
  return {
    AND: [
      { OR: [{ dateCreated: { lt: endExclusive } }, { dateCreated: null, createdAt: { lt: endExclusive } }] },
      { OR: [{ dateClosed: null }, { dateClosed: { gte: start } }] },
    ],
  };
}

export async function computeClassroomsTotal(monthDate: Date): Promise<number> {
  return withTimeout(prisma.classroom.count({ where: classroomWindowFilter(monthDate) }), KPI_COMPUTATION_TIMEOUT);
}

export async function computeSeniorShare(monthDate: Date): Promise<number> {
  const filter = classroomWindowFilter(monthDate);
  const [total, senior] = await withTimeout(Promise.all([
    prisma.classroom.count({ where: filter }),
    prisma.classroom.count({ where: { ...filter, section: 'SR' } }),
  ]), KPI_COMPUTATION_TIMEOUT);
  return total === 0 ? 0 : senior / total;
}

export async function computeMembersTotal(monthDate: Date): Promise<number> {
  const { start, endExclusive } = monthWindow(monthDate);
  return withTimeout(prisma.member.count({
    where: {
      joiningDate: { lt: endExclusive },
      OR: [{ leavingDate: null }, { leavingDate: { gte: start } }],
      typeHistory: { some: { memberType: { in: ['ANNUAL', 'HONORARY', 'LIFE', 'FOUNDER'] }, startDate: { lt: endExclusive }, OR: [{ endDate: null }, { endDate: { gte: start } }] } },
    },
  }), KPI_COMPUTATION_TIMEOUT);
}

export async function computeProjectsOngoing(monthDate: Date): Promise<number> {
  return computeProjectCount(monthDate, 'ONGOING');
}

export async function computeProjectsPast(monthDate: Date): Promise<number> {
  return computeProjectCount(monthDate, 'COMPLETED');
}

export function personsTrainedMonthFilter(monthDate: Date): Prisma.InternWhereInput {
  const { start, endExclusive } = monthWindow(monthDate);
  return {
    // Joining during the selected month is included; an unknown joining date is not.
    joiningDate: { lt: endExclusive },
    OR: [
      { status: 'ACTIVE' },
      { completionDate: null },
      // Completion is compared by month, not by the day within that month.
      { completionDate: { gte: start, lt: endExclusive } },
    ],
  };
}

export async function computePersonsTrained(
  monthDate: Date,
  client: InternCountClient = prisma,
): Promise<number> {
  return withTimeout(client.intern.count({
    where: personsTrainedMonthFilter(monthDate),
  }), KPI_COMPUTATION_TIMEOUT);
}

export async function computeStudentsPassedX(
  monthDate: Date,
  client: LegacyBoardResultClient = prisma,
): Promise<number> {
  // All legacy board-result records whose passingYear equals the KPI snapshot
  // year. The snapshot month intentionally does not affect this annual count.
  return withTimeout(client.legacyBoardResult.count({
    where: { passingYear: normalizeMonthDate(monthDate).getUTCFullYear() },
  }), KPI_COMPUTATION_TIMEOUT);
}

function fiscalEndExclusive(endDate: Date): Date {
  return new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() + 1));
}

export async function getFinanceAggregate(type: 'CREDIT' | 'DEBIT', fyId: string, from: Date, toExclusive: Date): Promise<number> {
  const agg = await withTimeout(prisma.transaction.aggregate({
    where: {
      type,
      statement: { financialYearId: fyId },
      OR: [
        { txnDate: { gte: from, lt: toExclusive } },
        { txnDate: null, valueDate: { gte: from, lt: toExclusive } },
      ],
    },
    _sum: { amount: true },
  }), KPI_COMPUTATION_TIMEOUT);
  return Number(agg._sum.amount || 0) / 100_000;
}

export async function getMonthlyFinanceAggregate(
  type: 'CREDIT' | 'DEBIT',
  monthDate: Date,
  client: MonthlyFinanceAggregateClient = prisma,
): Promise<number> {
  // A month-card finance value is scoped to its MonthlyStatement, rather than a
  // cumulative financial-year window. CREDIT is revenue; DEBIT is expenditure.
  const targetMonth = normalizeMonthDate(monthDate);
  const aggregate = await withTimeout(client.transaction.aggregate({
    where: {
      type,
      statement: {
        year: targetMonth.getUTCFullYear(),
        month: targetMonth.getUTCMonth() + 1,
      },
    },
    _sum: { amount: true },
  }), KPI_COMPUTATION_TIMEOUT);
  const amount = Number(aggregate._sum.amount ?? 0);
  if (!Number.isFinite(amount)) throw new Error('Invalid monthly finance amount');
  return amount / 100_000;
}

export async function computeMonthlyFinances(
  monthDate: Date,
  client: MonthlyFinanceAggregateClient = prisma,
): Promise<{ revenue: number; expenditure: number }> {
  const [revenue, expenditure] = await Promise.all([
    getMonthlyFinanceAggregate('CREDIT', monthDate, client),
    getMonthlyFinanceAggregate('DEBIT', monthDate, client),
  ]);
  return { revenue, expenditure };
}

export async function upsertAuto(
  kpiId: string,
  month: Date,
  value: number,
  client: AutoValueClient = prisma,
): Promise<void> {
  if (!kpiId || !Number.isFinite(value)) throw new Error('Invalid KPI auto value');
  const normalizedMonth = normalizeMonthDate(month);
  await withTimeout(client.kPIMonthlyValue.upsert({
    where: { kpiId_month_source: { kpiId, month: normalizedMonth, source: 'AUTO' } },
    update: { value },
    create: { kpiId, month: normalizedMonth, value, source: 'AUTO' },
  }), KPI_COMPUTATION_TIMEOUT);
}

export async function computeCentresTotal(monthDate: Date): Promise<number> {
  const { start, endExclusive } = monthWindow(monthDate);
  return withTimeout(prisma.centre.count({
    where: { dateAssociated: { lt: endExclusive }, OR: [{ dateLeft: null }, { dateLeft: { gte: start } }] },
  }), KPI_COMPUTATION_TIMEOUT);
}

export async function computeFinances(monthDate: Date): Promise<{ currentRevenue: number; currentExpenditure: number; pastRevenue: number; pastExpenditure: number }> {
  const targetMonth = normalizeMonthDate(monthDate);
  const currentFy = await withTimeout(prisma.financialYear.findFirst({
    where: { startDate: { lte: targetMonth }, endDate: { gte: targetMonth } },
    orderBy: { startDate: 'desc' },
  }), KPI_COMPUTATION_TIMEOUT);
  const pastFy = currentFy
    ? await withTimeout(prisma.financialYear.findFirst({ where: { endDate: { lt: currentFy.startDate } }, orderBy: { endDate: 'desc' } }), KPI_COMPUTATION_TIMEOUT)
    : await withTimeout(prisma.financialYear.findFirst({ where: { endDate: { lt: targetMonth } }, orderBy: { endDate: 'desc' } }), KPI_COMPUTATION_TIMEOUT);

  const currentCutoff = currentFy
    ? (nextMonthStart(targetMonth) < fiscalEndExclusive(currentFy.endDate) ? nextMonthStart(targetMonth) : fiscalEndExclusive(currentFy.endDate))
    : null;
  const pastCutoff = pastFy ? fiscalEndExclusive(pastFy.endDate) : null;
  const [currentRevenue, currentExpenditure, pastRevenue, pastExpenditure] = await Promise.all([
    currentFy && currentCutoff ? getFinanceAggregate('CREDIT', currentFy.id, currentFy.startDate, currentCutoff) : 0,
    currentFy && currentCutoff ? getFinanceAggregate('DEBIT', currentFy.id, currentFy.startDate, currentCutoff) : 0,
    pastFy && pastCutoff ? getFinanceAggregate('CREDIT', pastFy.id, pastFy.startDate, pastCutoff) : 0,
    pastFy && pastCutoff ? getFinanceAggregate('DEBIT', pastFy.id, pastFy.startDate, pastCutoff) : 0,
  ]);
  return { currentRevenue, currentExpenditure, pastRevenue, pastExpenditure };
}

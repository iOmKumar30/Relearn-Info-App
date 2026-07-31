import prisma from '@/libs/prismadb';

const KPI_COMPUTATION_TIMEOUT = 30000; // 30 seconds

export function logOperation(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...meta };

  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
      timeoutMs,
    ),
  );
  return Promise.race([promise, timeoutPromise]);
}

export async function computeStudentsTotal(monthDate: Date): Promise<number> {
  try {
    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.student.count({
        where: {
          createdAt: { lte: endOfMonth },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute students total', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute students total');
  }
}
export async function computeTutorsTotal(monthDate: Date): Promise<number> {
  try {
    const startOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.userRoleHistory.count({
        where: {
          role: { name: 'TUTOR' },
          startDate: { lte: endOfMonth },
          OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute tutors total', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute tutors total');
  }
}
export async function computeClassroomsTotal(monthDate: Date): Promise<number> {
  try {
    const firstOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const lastDayOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.classroom.count({
        where: {
          // Classroom must have been created on or before this month ended.
          dateCreated: { lte: lastDayOfMonth },

          // Classroom must either still be open, or close during/after this month.
          OR: [{ dateClosed: null }, { dateClosed: { gte: firstOfMonth } }],
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute classrooms total', {
      month: monthDate.toISOString(),
      error: String(error),
    });
    throw new Error('Failed to compute classrooms total');
  }
}

export async function computeSeniorShare(monthDate: Date): Promise<number> {
  try {
    const firstOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const dateFilter = {
      dateCreated: { lte: endOfMonth },
      OR: [{ dateClosed: null }, { dateClosed: { gte: firstOfMonth } }],
    };

    const [total, sr] = await withTimeout(
      Promise.all([
        prisma.classroom.count({ where: dateFilter }),
        prisma.classroom.count({
          where: {
            ...dateFilter,
            section: 'SR',
          },
        }),
      ]),
      KPI_COMPUTATION_TIMEOUT,
    );

    return total === 0 ? 0 : sr / total;
  } catch (error) {
    logOperation('error', 'Failed to compute senior share', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute senior share');
  }
}

export async function computeMembersTotal(monthDate: Date): Promise<number> {
  try {
    const firstOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.member.count({
        where: {
          memberType: {
            in: ['ANNUAL', 'HONORARY', 'LIFE', 'FOUNDER'],
          },
          joiningDate: { lte: endOfMonth },
          memberTypeHistory: {
            some: {
              startDate: { lte: endOfMonth },
              OR: [{ endDate: null }, { endDate: { gte: firstOfMonth } }],
            },
          },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute members total', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute members total');
  }
}

export async function computeProjectsOngoing(monthDate: Date): Promise<number> {
  try {
    const firstOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.project.count({
        where: {
          startDate: { lte: endOfMonth },
          OR: [
            { endDate: null },
            { endDate: { gte: firstOfMonth } },
            { status: 'ONGOING' },
          ],
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute ongoing projects', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute ongoing projects');
  }
}

export async function computeProjectsPast(monthDate: Date): Promise<number> {
  try {
    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.project.count({
        where: {
          status: 'COMPLETED',
          endDate: { lte: endOfMonth },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute past projects', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute past projects');
  }
}

export async function computePersonsTrained(monthDate: Date): Promise<number> {
  try {
    const firstOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.member.count({
        where: {
          memberType: 'INTERN',
          joiningDate: { lte: endOfMonth },
          memberTypeHistory: {
            some: {
              memberType: 'INTERN',
              startDate: { lte: endOfMonth },
              OR: [{ endDate: null }, { endDate: { gte: firstOfMonth } }],
            },
          },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute persons trained', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute persons trained');
  }
}

export async function computeStudentsPassedX(monthDate: Date): Promise<number> {
  try {
    const targetYear = monthDate.getFullYear();
    return await withTimeout(
      prisma.boardExamResult.count({
        where: { passingYear: targetYear },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute students passed X', {
      error: String(error),
    });
    throw new Error('Failed to compute students passed X');
  }
}
export async function getFinanceAggregate(
  type: 'CREDIT' | 'DEBIT',
  fyId: string,
): Promise<number> {
  try {
    if (!fyId || typeof fyId !== 'string') {
      throw new Error('Invalid financial year ID');
    }

    const agg = await withTimeout(
      prisma.transaction.aggregate({
        where: {
          type,
          statement: { financialYearId: fyId },
        },
        _sum: { amount: true },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );

    return Number(agg._sum.amount || 0) / 100000;
  } catch (error) {
    logOperation('error', 'Failed to compute finance aggregate', {
      type,
      fyId,
      error: String(error),
    });
    throw new Error(`Failed to compute finance aggregate for type: ${type}`);
  }
}

export async function upsertAuto(
  kpiId: string,
  month: Date,
  value: number,
): Promise<void> {
  try {
    if (!kpiId || !month || typeof value !== 'number') {
      throw new Error('Invalid upsert parameters');
    }

    await withTimeout(
      prisma.kPIMonthlyValue.upsert({
        where: { kpiId_month_source: { kpiId, month, source: 'AUTO' } },
        update: { value },
        create: { kpiId, month, value, source: 'AUTO' },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to upsert KPI value', {
      kpiId,
      month: month.toISOString(),
      value,
      error: String(error),
    });
    throw error;
  }
}

export async function computeCentresTotal(monthDate: Date): Promise<number> {
  try {
    const firstOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    );

    const endOfMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return await withTimeout(
      prisma.centre.count({
        where: {
          // Centre must have existed by the end of the selected month.
          createdAt: { lte: endOfMonth },

          // Include centres that were open for any part of that month.
          OR: [{ dateLeft: null }, { dateLeft: { gte: firstOfMonth } }],
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation('error', 'Failed to compute centres total', {
      month: monthDate.toISOString(),
      error: String(error),
    });

    throw new Error('Failed to compute centres total');
  }
}

export async function computeFinances(monthDate: Date): Promise<{
  currentRevenue: number;
  currentExpenditure: number;
  pastRevenue: number;
  pastExpenditure: number;
}> {
  try {
    const refDate = monthDate; // use the target month's date

    const currentFy = await withTimeout(
      prisma.financialYear.findFirst({
        where: {
          startDate: { lte: refDate },
          endDate: { gte: refDate },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );

    let pastFy = null;
    if (currentFy) {
      pastFy = await withTimeout(
        prisma.financialYear.findFirst({
          where: { endDate: { lte: currentFy.startDate } },
          orderBy: { endDate: 'desc' },
        }),
        KPI_COMPUTATION_TIMEOUT,
      );
    } else {
      pastFy = await withTimeout(
        prisma.financialYear.findFirst({
          where: { endDate: { lte: refDate } },
          orderBy: { endDate: 'desc' },
        }),
        KPI_COMPUTATION_TIMEOUT,
      );
    }

    return {
      currentRevenue: currentFy
        ? await getFinanceAggregate('CREDIT', currentFy.id)
        : 0,
      currentExpenditure: currentFy
        ? await getFinanceAggregate('DEBIT', currentFy.id)
        : 0,
      pastRevenue: pastFy ? await getFinanceAggregate('CREDIT', pastFy.id) : 0,
      pastExpenditure: pastFy
        ? await getFinanceAggregate('DEBIT', pastFy.id)
        : 0,
    };
  } catch (error) {
    logOperation('error', 'Failed to compute finances', {
      error: String(error),
    });
    throw new Error('Failed to compute finances');
  }
}

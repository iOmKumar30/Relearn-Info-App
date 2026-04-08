import prisma from "@/libs/prismadb";

const KPI_COMPUTATION_TIMEOUT = 30000; // 30 seconds

export function logOperation(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...meta };

  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else if (level === "warn") {
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

export async function computeStudentsTotal(): Promise<number> {
  try {
    return await withTimeout(prisma.student.count(), KPI_COMPUTATION_TIMEOUT);
  } catch (error) {
    logOperation("error", "Failed to compute students total", {
      error: String(error),
    });
    throw new Error("Failed to compute students total");
  }
}

export async function computeTutorsTotal(): Promise<number> {
  try {
    return await withTimeout(
      prisma.user.count({
        where: {
          status: "ACTIVE",
          roleHistory: {
            some: {
              endDate: null,
              role: { name: "TUTOR" },
            },
          },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute tutors total", {
      error: String(error),
    });
    throw new Error("Failed to compute tutors total");
  }
}

export async function computeClassroomsTotal(): Promise<number> {
  try {
    return await withTimeout(
      prisma.classroom.count({ where: { status: "ACTIVE" } }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute classrooms total", {
      error: String(error),
    });
    throw new Error("Failed to compute classrooms total");
  }
}

export async function computeSeniorShare(): Promise<number> {
  try {
    const total = await withTimeout(
      prisma.classroom.count({ where: { status: "ACTIVE" } }),
      KPI_COMPUTATION_TIMEOUT,
    );

    if (total === 0) return 0;

    const sr = await withTimeout(
      prisma.classroom.count({
        where: { status: "ACTIVE", section: "SR" },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );

    return sr / total;
  } catch (error) {
    logOperation("error", "Failed to compute senior share", {
      error: String(error),
    });
    throw new Error("Failed to compute senior share");
  }
}

export async function computeMembersTotal(): Promise<number> {
  try {
    return await withTimeout(
      prisma.member.count({
        where: {
          status: "ACTIVE",
          memberType: { in: ["ANNUAL", "HONORARY", "LIFE", "FOUNDER"] },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute members total", {
      error: String(error),
    });
    throw new Error("Failed to compute members total");
  }
}

export async function computeProjectsOngoing(): Promise<number> {
  try {
    return await withTimeout(
      prisma.project.count({ where: { status: "ONGOING" } }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute ongoing projects", {
      error: String(error),
    });
    throw new Error("Failed to compute ongoing projects");
  }
}

export async function computeProjectsPast(): Promise<number> {
  try {
    return await withTimeout(
      prisma.project.count({ where: { status: "COMPLETED" } }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute past projects", {
      error: String(error),
    });
    throw new Error("Failed to compute past projects");
  }
}

export async function computePersonsTrained(): Promise<number> {
  try {
    return await withTimeout(
      prisma.member.count({
        where: {
          status: "ACTIVE",
          memberType: "INTERN",
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute persons trained", {
      error: String(error),
    });
    throw new Error("Failed to compute persons trained");
  }
}

export async function computeStudentsPassedX(): Promise<number> {
  try {
    const currentYear = new Date().getFullYear();
    return await withTimeout(
      prisma.boardExamResult.count({
        where: { passingYear: currentYear },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute students passed X", {
      error: String(error),
    });
    throw new Error("Failed to compute students passed X");
  }
}

export async function getFinanceAggregate(
  type: "CREDIT" | "DEBIT",
  fyId: string,
): Promise<number> {
  try {
    if (!fyId || typeof fyId !== "string") {
      throw new Error("Invalid financial year ID");
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
    logOperation("error", "Failed to compute finance aggregate", {
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
    if (!kpiId || !month || typeof value !== "number") {
      throw new Error("Invalid upsert parameters");
    }

    await withTimeout(
      prisma.kPIMonthlyValue.upsert({
        where: { kpiId_month_source: { kpiId, month, source: "AUTO" } },
        update: { value },
        create: { kpiId, month, value, source: "AUTO" },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to upsert KPI value", {
      kpiId,
      month: month.toISOString(),
      value,
      error: String(error),
    });
    throw error;
  }
}

// Add this function anywhere in libs/kpi/compute.ts
export async function computeCentresTotal(): Promise<number> {
  try {
    return await withTimeout(
      prisma.centre.count({ where: { status: "ACTIVE" } }),
      KPI_COMPUTATION_TIMEOUT,
    );
  } catch (error) {
    logOperation("error", "Failed to compute centres total", {
      error: String(error),
    });
    throw new Error("Failed to compute centres total");
  }
}

export async function computeFinances(): Promise<{
  currentRevenue: number;
  currentExpenditure: number;
  pastRevenue: number;
  pastExpenditure: number;
}> {
  try {
    const now = new Date();

    const currentFy = await withTimeout(
      prisma.financialYear.findFirst({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      KPI_COMPUTATION_TIMEOUT,
    );

    let pastFy = null;

    if (currentFy) {
      // If we are currently in an active FY, the past FY is the one that ended right before this one started
      pastFy = await withTimeout(
        prisma.financialYear.findFirst({
          where: { endDate: { lte: currentFy.startDate } },
          orderBy: { endDate: "desc" },
        }),
        KPI_COMPUTATION_TIMEOUT,
      );
    } else {
      // If no current FY is defined for today's date yet,
      // the past FY is simply the most recently ended one in the database.
      pastFy = await withTimeout(
        prisma.financialYear.findFirst({
          where: { endDate: { lte: now } },
          orderBy: { endDate: "desc" },
        }),
        KPI_COMPUTATION_TIMEOUT,
      );
    }

    return {
      currentRevenue: currentFy
        ? await getFinanceAggregate("CREDIT", currentFy.id)
        : 0,
      currentExpenditure: currentFy
        ? await getFinanceAggregate("DEBIT", currentFy.id)
        : 0,
      pastRevenue: pastFy ? await getFinanceAggregate("CREDIT", pastFy.id) : 0,
      pastExpenditure: pastFy
        ? await getFinanceAggregate("DEBIT", pastFy.id)
        : 0,
    };
  } catch (error) {
    logOperation("error", "Failed to compute finances", {
      error: String(error),
    });
    throw new Error("Failed to compute finances");
  }
}

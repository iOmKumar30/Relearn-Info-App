"use server";

import prisma from "@/libs/prismadb";
import { revalidatePath } from "next/cache";

export type TrainingAttendanceStatus =
  | "ABSENT"
  | "PRESENT"
  | "PRESENT_RESPONDED";

export async function getTutorTrainingYears() {
  const years = await prisma.tutorTrainingYear.findMany({
    orderBy: { year: "desc" },
  });
  return years.map((y) => y.year);
}

export async function createTutorTrainingYear(year: number) {
  try {
    await prisma.tutorTrainingYear.upsert({
      where: { year },
      update: {},
      create: { year, isActive: true },
    });
    revalidatePath("/tutor-attendance");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create year" };
  }
}

export async function getMonthlyTrainingData(year: number, month: number) {
  // Fetch all classes for this month
  const classes = await prisma.tutorTrainingClass.findMany({
    where: { yearId: year, month },
    orderBy: { date: "asc" },
  });

  const totalClasses = classes.length;
  const classIds = classes.map((c) => c.id);

  // NEW: Fetch the current active payout rates to calculate the maxPossiblePayout
  let currentRates = await prisma.trainingPayoutRate.findUnique({
    where: { id: "default_rate" },
  });

  // Fallback just in case they haven't set the rates yet
  if (!currentRates) {
    currentRates = {
      id: "default_rate",
      absentAmount: 0,
      presentAmount: 50,
      presentResponded: 75,
      updatedAt: new Date(),
    };
  }

  // Max payout is calculated dynamically based on current P&R rate
  const maxPossiblePayout = totalClasses * currentRates.presentResponded;

  // Fetch Active Tutors by their Role
  const activeTutorRoles: any = await prisma.userRoleHistory.findMany({
    where: {
      endDate: null,
      role: {
        name: "TUTOR",
      },
      user: {
        status: "ACTIVE",
        tutorAssignments: {
          some: {
            endDate: null,
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          tutorAssignments: {
            where: { endDate: null },
            select: {
              classroom: { select: { centreId: true } },
            },
          },
        },
      },
    },
  });

  // Extract unique tutors
  const uniqueTutorsMap = new Map<string, any>();
  for (const history of activeTutorRoles) {
    if (history.user?.id && !uniqueTutorsMap.has(history.user.id)) {
      uniqueTutorsMap.set(history.user.id, history.user);
    }
  }

  const activeTutors = Array.from(uniqueTutorsMap.values());
  const tutorIds = activeTutors.map((t) => t.id);

  // Fetch attendances separately — only for this month's classes
  const attendances = await prisma.tutorTrainingAttendance.findMany({
    where: {
      tutorId: { in: tutorIds },
      ...(classIds.length > 0 ? { classId: { in: classIds } } : {}),
    },
  });

  // Group attendances by tutorId for O(1) lookup
  // NEW: We are now saving the actual historical `amount` stored in the DB alongside the status!
  const attendanceByTutor = new Map<
    string,
    { classId: string; status: string; amount: number }[]
  >();

  attendances.forEach((a) => {
    if (!attendanceByTutor.has(a.tutorId)) {
      attendanceByTutor.set(a.tutorId, []);
    }
    attendanceByTutor
      .get(a.tutorId)!
      .push({ classId: a.classId, status: a.status, amount: a.amount });
  });

  // Fetch Active Facilitators to map them to Centres
  const activeFacilitators = await prisma.facilitatorAssignment.findMany({
    where: { endDate: null },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Map Centre ID to Facilitator
  const centreToFacilitatorMap: Record<string, { id: string; name: string }> =
    {};
  activeFacilitators.forEach((fac) => {
    if (fac.user) {
      centreToFacilitatorMap[fac.centreId] = {
        id: fac.user.id,
        name: fac.user.name || "Unassigned",
      };
    }
  });

  // Process the final data
  const tutorList = [];
  const facilitatorMap = new Map<
    string,
    { name: string; totalAmount: number }
  >();
  const validClassIds = new Set(classIds);

  for (const tutor of activeTutors) {
    const centreId = tutor.tutorAssignments?.[0]?.classroom?.centreId;
    const facilitator = centreId ? centreToFacilitatorMap[centreId] : null;

    const facilitatorName = facilitator?.name || "Unassigned";
    const facilitatorId = facilitator?.id || "unassigned";

    let totalPayout = 0;
    const attendanceMap: Record<string, TrainingAttendanceStatus> = {};

    const tutorAttendances = attendanceByTutor.get(tutor.id) ?? [];

    // NEW: We loop over the records and sum `record.amount` exactly as it was saved in the DB
    tutorAttendances.forEach((record) => {
      if (validClassIds.has(record.classId)) {
        attendanceMap[record.classId] =
          record.status as TrainingAttendanceStatus;
        totalPayout += record.amount; // Uses the historical locked-in amount
      }
    });

    const score =
      maxPossiblePayout > 0
        ? Math.round((totalPayout / maxPossiblePayout) * 100)
        : 0;

    tutorList.push({
      id: tutor.id,
      name: tutor.name || "Unknown Tutor",
      facilitatorName,
      attendanceMap,
      totalPayout,
      score,
    });

    // Aggregate payout for the Facilitator summary
    if (facilitatorMap.has(facilitatorId)) {
      facilitatorMap.get(facilitatorId)!.totalAmount += totalPayout;
    } else {
      facilitatorMap.set(facilitatorId, {
        name: facilitatorName,
        totalAmount: totalPayout,
      });
    }
  }

  // Sort tutors alphabetically
  const finalTutorList = tutorList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    classes,
    tutors: finalTutorList,
    facilitatorSummary: Array.from(facilitatorMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
}

export async function addTrainingClass(
  year: number,
  month: number,
  date: Date,
  trainingBy: string,
) {
  try {
    await prisma.tutorTrainingClass.create({
      data: {
        yearId: year,
        month,
        date,
        trainingBy,
      },
    });

    revalidatePath(`/tutor-attendance/${year}/${month}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to add class:", error);
    return { success: false, error: "Failed to create training class" };
  }
}
export async function updateTrainingClass(
  year: number,
  month: number,
  classId: string,
  date: Date,
  trainingBy: string,
) {
  try {
    await prisma.tutorTrainingClass.update({
      where: { id: classId },
      data: { date, trainingBy },
    });
    revalidatePath(`/tutor-attendance/${year}/${month}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update class:", error);
    return { success: false, error: "Failed to update training class" };
  }
}
export async function deleteTrainingClass(
  classId: string,
  year: number,
  month: number,
) {
  try {
    const cls = await prisma.tutorTrainingClass.findUnique({
      where: { id: classId },
      select: { id: true, yearId: true, month: true },
    });
    if (!cls) return { success: false as const, error: "Class not found" };

    await prisma.tutorTrainingClass.delete({ where: { id: classId } });
    revalidatePath(`/tutor-attendance/${year}/${month}`);
    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete class:", error);
    return { success: false, error: "Failed to delete training class" };
  }
}
export async function saveTutorAttendance(
  classId: string,
  tutorId: string,
  status: TrainingAttendanceStatus,
) {
  try {
    const rates = await getPayoutRates();

    let amount = 0;
    if (status === "ABSENT") amount = rates.absentAmount;
    if (status === "PRESENT") amount = rates.presentAmount;
    if (status === "PRESENT_RESPONDED") amount = rates.presentResponded;

    await prisma.tutorTrainingAttendance.upsert({
      where: {
        classId_tutorId: { classId, tutorId },
      },
      update: { status, amount },
      create: { classId, tutorId, status, amount },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to save attendance" };
  }
}

export async function getQuarterlyReportData(
  year: number,
  startMonth: number,
  endMonth: number,
) {
  const activeTutorRoles: any = await prisma.userRoleHistory.findMany({
    where: {
      endDate: null,
      role: {
        name: "TUTOR",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          tutorAssignments: {
            where: { endDate: null },
            select: {
              classroom: { select: { centreId: true } },
            },
          },
        },
      },
    },
  });

  const uniqueTutorsMap = new Map<string, any>();
  for (const history of activeTutorRoles) {
    if (history.user && !uniqueTutorsMap.has(history.user.id)) {
      uniqueTutorsMap.set(history.user.id, history.user);
    }
  }

  const activeTutors = Array.from(uniqueTutorsMap.values());
  const tutorIds = activeTutors.map((t) => t.id);

  const attendances = await prisma.tutorTrainingAttendance.findMany({
    where: {
      tutorId: { in: tutorIds },
      class: {
        yearId: year,
        month: { gte: startMonth, lte: endMonth },
      },
    },
    select: {
      tutorId: true,
      amount: true,
    },
  });

  const attendanceByTutor = new Map<string, number[]>();
  attendances.forEach((a) => {
    if (!attendanceByTutor.has(a.tutorId)) {
      attendanceByTutor.set(a.tutorId, []);
    }
    attendanceByTutor.get(a.tutorId)!.push(a.amount);
  });

  const activeFacilitators = await prisma.facilitatorAssignment.findMany({
    where: { endDate: null },
    include: { user: { select: { id: true, name: true } } },
  });

  const centreToFacilitatorMap: Record<string, { id: string; name: string }> =
    {};
  activeFacilitators.forEach((fac) => {
    if (fac.user) {
      centreToFacilitatorMap[fac.centreId] = {
        id: fac.user.id,
        name: fac.user.name || "Unassigned",
      };
    }
  });

  const tutorList = [];
  const facilitatorMap = new Map<
    string,
    { name: string; totalAmount: number }
  >();

  for (const tutor of activeTutors) {
    const centreId = tutor.tutorAssignments?.[0]?.classroom?.centreId;
    const facilitator = centreId ? centreToFacilitatorMap[centreId] : null;

    const facilitatorName = facilitator?.name || "Unassigned";
    const facilitatorId = facilitator?.id || "unassigned";

    let totalPayout = 0;

    const tutorAmounts = attendanceByTutor.get(tutor.id) ?? [];
    tutorAmounts.forEach((amount) => {
      totalPayout += amount;
    });

    tutorList.push({
      id: tutor.id,
      name: tutor.name || "Unknown Tutor",
      facilitatorName,
      totalPayout,
    });

    if (facilitatorMap.has(facilitatorId)) {
      const existing = facilitatorMap.get(facilitatorId)!;
      existing.totalAmount += totalPayout;
    } else {
      facilitatorMap.set(facilitatorId, {
        name: facilitatorName,
        totalAmount: totalPayout,
      });
    }
  }

  tutorList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    tutors: tutorList,
    facilitatorSummary: Array.from(facilitatorMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
}

export async function getPayoutRates() {
  let rates = await prisma.trainingPayoutRate.findUnique({
    where: { id: "default_rate" },
  });

  if (!rates) {
    rates = await prisma.trainingPayoutRate.create({
      data: {
        id: "default_rate",
        absentAmount: 0,
        presentAmount: 50,
        presentResponded: 75,
      },
    });
  }
  return rates;
}

export async function updatePayoutRates(data: {
  absentAmount: number;
  presentAmount: number;
  presentResponded: number;
}) {
  try {
    await prisma.trainingPayoutRate.upsert({
      where: { id: "default_rate" },
      update: data,
      create: { id: "default_rate", ...data },
    });

    revalidatePath("/tutor-attendance");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update rates" };
  }
}

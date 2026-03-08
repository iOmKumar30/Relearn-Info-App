"use server";

import prisma from "@/libs/prismadb";
import { revalidatePath } from "next/cache";

export type TrainingAttendanceStatus =
  | "ABSENT"
  | "PRESENT"
  | "PRESENT_RESPONDED";

const PAYOUT_RATES = {
  ABSENT: 0,
  PRESENT: 50,
  PRESENT_RESPONDED: 75,
};

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
  const maxPossiblePayout = totalClasses * PAYOUT_RATES.PRESENT_RESPONDED;
  const classIds = classes.map((c) => c.id);

  // Fetch Active Assignments (no nested user relation include)
  const activeAssignments = await prisma.tutorAssignment.findMany({
    where: { endDate: null },
    include: {
      user: {
        select: { id: true, name: true },
      },
      classroom: {
        select: { centreId: true },
      },
    },
  });

  // Collect unique tutor IDs
  const tutorIds = activeAssignments
    .map((a) => a.user?.id)
    .filter((id): id is string => !!id);

  // Fetch attendances separately — only for this month's classes
  const attendances = await prisma.tutorTrainingAttendance.findMany({
    where: {
      tutorId: { in: tutorIds },
      ...(classIds.length > 0 ? { classId: { in: classIds } } : {}),
    },
  });

  // Group attendances by tutorId for O(1) lookup
  const attendanceByTutor = new Map<
    string,
    { classId: string; status: string }[]
  >();
  attendances.forEach((a) => {
    if (!attendanceByTutor.has(a.tutorId)) {
      attendanceByTutor.set(a.tutorId, []);
    }
    attendanceByTutor
      .get(a.tutorId)!
      .push({ classId: a.classId, status: a.status });
  });

  // Fetch Active Facilitators
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

  const tutorList = [];
  const facilitatorMap = new Map<
    string,
    { name: string; totalAmount: number }
  >();
  const validClassIds = new Set(classIds);

  for (const assignment of activeAssignments) {
    const tutor = assignment.user;
    if (!tutor) continue;

    const centreId = assignment.classroom?.centreId;
    const facilitator = centreId ? centreToFacilitatorMap[centreId] : null;

    const facilitatorName = facilitator?.name || "Unassigned";
    const facilitatorId = facilitator?.id || "unassigned";

    let totalPayout = 0;
    const attendanceMap: Record<string, TrainingAttendanceStatus> = {};

    const tutorAttendances = attendanceByTutor.get(tutor.id) ?? [];
    tutorAttendances.forEach((record) => {
      if (validClassIds.has(record.classId)) {
        attendanceMap[record.classId] =
          record.status as TrainingAttendanceStatus;
        totalPayout +=
          PAYOUT_RATES[record.status as TrainingAttendanceStatus] || 0;
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

    if (facilitatorMap.has(facilitatorId)) {
      facilitatorMap.get(facilitatorId)!.totalAmount += totalPayout;
    } else {
      facilitatorMap.set(facilitatorId, {
        name: facilitatorName,
        totalAmount: totalPayout,
      });
    }
  }

  // Deduplicate tutors (multiple assignments for same tutor)
  const uniqueTutorsMap = new Map();
  tutorList.forEach((t) => {
    if (!uniqueTutorsMap.has(t.id)) {
      uniqueTutorsMap.set(t.id, t);
    }
  });

  const finalTutorList = Array.from(uniqueTutorsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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

export async function saveTutorAttendance(
  classId: string,
  tutorId: string,
  status: TrainingAttendanceStatus,
) {
  try {
    await prisma.tutorTrainingAttendance.upsert({
      where: {
        classId_tutorId: { classId, tutorId },
      },
      update: { status },
      create: { classId, tutorId, status },
    });

    revalidatePath(`/tutor-attendance/${classId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to save attendance:", error);
    return { success: false, error: "Failed to save attendance record" };
  }
}

export async function getQuarterlyReportData(
  year: number,
  startMonth: number,
  endMonth: number,
) {
  const activeTutors = await prisma.user.findMany({
    where: {
      tutorAssignments: {
        some: { endDate: null },
      },
    },
    select: {
      id: true,
      name: true,
      // Fixed nested query
      tutorAssignments: {
        where: { endDate: null },
        select: {
          classroom: {
            select: { centreId: true },
          },
        },
      },
      trainingAttendances: {
        where: {
          class: {
            yearId: year,
            month: { gte: startMonth, lte: endMonth },
          },
        },
        select: { status: true },
      },
    },
  });

  // Fetch facilitators exactly like we did in the monthly function
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
    const centreId = tutor.tutorAssignments[0]?.classroom?.centreId;
    const facilitator = centreId ? centreToFacilitatorMap[centreId] : null;

    const facilitatorName = facilitator?.name || "Unassigned";
    const facilitatorId = facilitator?.id || "unassigned";

    let totalPayout = 0;
    tutor.trainingAttendances.forEach((record) => {
      totalPayout +=
        PAYOUT_RATES[record.status as TrainingAttendanceStatus] || 0;
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

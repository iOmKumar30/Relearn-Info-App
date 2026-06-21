import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const round2 = (n: number) => Math.round(n * 100) / 100;

function parseYear(value: string) {
  const year = Number(value);
  return Number.isInteger(year) ? year : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { year: rawYear } = await ctx.params;
  const year = parseYear(rawYear);
  if (!year) return new NextResponse("Invalid year", { status: 400 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );
  const q = (searchParams.get("q") || "").trim();

  const yearExists = await prisma.boardExamYear.findUnique({
    where: { year },
    select: {
      year: true,
      createdAt: true,
      _count: { select: { results: true } },
    },
  });
  if (!yearExists) return new NextResponse("Year not found", { status: 404 });

  const where = {
    passingYear: year,
    ...(q
      ? {
          student: {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { rollNo: { contains: q, mode: "insensitive" as const } },
              { schoolName: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [total, rows, analyticsRows] = await Promise.all([
    prisma.boardExamResult.count({ where }),
    prisma.boardExamResult.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        studentId: true,
        totalMarks: true,
        marksObtained: true,
        grade: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            schoolName: true,
            city: true,
            state: true,
          },
        },
        classroom: {
          select: { code: true },
        },
        spTutor: {
          select: { name: true },
        },
      },
    }),
    prisma.boardExamResult.findMany({
      where: { passingYear: year },
      select: { totalMarks: true, marksObtained: true },
    }),
  ]);

  const percentages = analyticsRows.map((r) =>
    r.totalMarks > 0 ? (r.marksObtained / r.totalMarks) * 100 : 0,
  );

  const analytics = {
    totalResults: yearExists._count.results,
    averagePercentage: percentages.length
      ? round2(percentages.reduce((a, b) => a + b, 0) / percentages.length)
      : 0,
    highestPercentage: percentages.length
      ? round2(Math.max(...percentages))
      : 0,
    averageMarksObtained: analyticsRows.length
      ? round2(
          analyticsRows.reduce((a, b) => a + b.marksObtained, 0) /
            analyticsRows.length,
        )
      : 0,
  };

  return NextResponse.json({
    year: yearExists.year,
    page,
    pageSize,
    total,
    analytics,
    rows: rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      rollNo: r.student.rollNo,
      schoolName: r.student.schoolName,
      city: r.student.city,
      state: r.student.state,
      totalMarks: r.totalMarks,
      marksObtained: r.marksObtained,
      percentage: round2(
        r.totalMarks > 0 ? (r.marksObtained / r.totalMarks) * 100 : 0,
      ),
      grade: r.grade,
      classroomCode: r.classroom?.code || null,
      tutorName: r.spTutor?.name || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { year: rawYear } = await ctx.params;
  const year = parseYear(rawYear);
  if (!year) return new NextResponse("Invalid year", { status: 400 });

  const body = await req.json();
  const studentId = String(body?.studentId || "").trim();
  const totalMarks = Number(body?.totalMarks);
  const marksObtained = Number(body?.marksObtained);
  const grade = String(body?.grade || "").trim();

  if (!studentId)
    return new NextResponse("Student is required", { status: 400 });
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return new NextResponse("Total marks must be greater than 0", {
      status: 400,
    });
  }
  if (
    !Number.isFinite(marksObtained) ||
    marksObtained < 0 ||
    marksObtained > totalMarks
  ) {
    return new NextResponse(
      "Marks obtained must be between 0 and total marks",
      { status: 400 },
    );
  }
  if (!grade) return new NextResponse("Grade is required", { status: 400 });

  const [yearExists, studentExists, duplicate] = await Promise.all([
    prisma.boardExamYear.findUnique({
      where: { year },
      select: { year: true },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        rollNo: true,
        schoolName: true,
        city: true,
        state: true,
      },
    }),
    prisma.boardExamResult.findUnique({ where: { studentId } }),
  ]);

  if (!yearExists) return new NextResponse("Year not found", { status: 404 });
  if (!studentExists)
    return new NextResponse("Student not found", { status: 404 });
  if (duplicate) {
    return new NextResponse("Selected student already has a board result", {
      status: 409,
    });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        assignments: {
          include: {
            classroom: {
              include: {
                tutorAssignments: true, // Get tutor history for these classrooms
              },
            },
          },
        },
      },
    });

    // Find the classroom the student was in during the passing year
    const relevantAssignment = student?.assignments.find(
      (a) =>
        a.joinDate.getFullYear() <= year &&
        (!a.leaveDate || a.leaveDate.getFullYear() >= year),
    );

    const historicalClassroomId = relevantAssignment?.classroomId || null;

    // Find the tutor who was teaching that classroom during the passing year
    let historicalTutorId = null;
    if (relevantAssignment) {
      const tutorAssignment =
        relevantAssignment.classroom.tutorAssignments.find(
          (ta) =>
            ta.startDate.getFullYear() <= year &&
            (!ta.endDate || ta.endDate.getFullYear() >= year),
        );
      historicalTutorId = tutorAssignment?.userId || null;
    }
    const created = await prisma.boardExamResult.create({
      data: {
        studentId,
        passingYear: year,
        totalMarks,
        marksObtained,
        grade,
        spTutorId: historicalTutorId,
        classroomId: historicalClassroomId,
      },
      select: {
        id: true,
        studentId: true,
        totalMarks: true,
        marksObtained: true,
        grade: true,
        createdAt: true,
        updatedAt: true,
        student: {
          select: {
            name: true,
            rollNo: true,
            schoolName: true,
            city: true,
            state: true,
          },
        },
        classroom: {
          select: { code: true },
        },
        spTutor: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        studentId: created.studentId,
        studentName: created.student.name,
        rollNo: created.student.rollNo,
        schoolName: created.student.schoolName,
        city: created.student.city,
        state: created.student.state,
        totalMarks: created.totalMarks,
        marksObtained: created.marksObtained,
        percentage: round2((created.marksObtained / created.totalMarks) * 100),
        grade: created.grade,
        classroomCode: created.classroom?.code || null,
        tutorName: created.spTutor?.name || null,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("BOARD_RESULT_CREATE_ERROR", e);
    return new NextResponse("Failed to create result", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { year: rawYear } = await ctx.params;
  const year = parseYear(rawYear);
  if (!year) return new NextResponse("Invalid year", { status: 400 });

  const exists = await prisma.boardExamYear.findUnique({
    where: { year },
    select: { year: true },
  });
  if (!exists) return new NextResponse("Year not found", { status: 404 });

  await prisma.boardExamYear.delete({ where: { year } });
  return new NextResponse(null, { status: 204 });
}

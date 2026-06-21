import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ resultId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { resultId } = await ctx.params;

  const row = await prisma.boardExamResult.findUnique({
    where: { id: resultId },
    select: {
      id: true,
      studentId: true,
      passingYear: true,
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

  if (!row) return new NextResponse("Not Found", { status: 404 });

  return NextResponse.json({
    id: row.id,
    studentId: row.studentId,
    studentName: row.student.name,
    rollNo: row.student.rollNo,
    schoolName: row.student.schoolName,
    city: row.student.city,
    state: row.student.state,
    passingYear: row.passingYear,
    totalMarks: row.totalMarks,
    marksObtained: row.marksObtained,
    percentage: round2((row.marksObtained / row.totalMarks) * 100),
    grade: row.grade,
    classroomCode: row.classroom?.code || null,
    tutorName: row.spTutor?.name || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ resultId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { resultId } = await ctx.params;
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

  const existing = await prisma.boardExamResult.findUnique({
    where: { id: resultId },
    select: { id: true, passingYear: true },
  });
  if (!existing) return new NextResponse("Result not found", { status: 404 });

  const duplicate = await prisma.boardExamResult.findFirst({
    where: {
      studentId,
      NOT: { id: resultId },
    },
    select: { id: true },
  });
  if (duplicate) {
    return new NextResponse("Selected student already has a board result", {
      status: 409,
    });
  }

  // Fetch student to recalculate the historical classroom and tutor snapshot
  const studentData = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assignments: {
        include: {
          classroom: {
            include: {
              tutorAssignments: true,
            },
          },
        },
      },
    },
  });

  if (!studentData)
    return new NextResponse("Student not found", { status: 404 });

  // Calculate snapshot based on the passing year
  const year = existing.passingYear;
  const relevantAssignment = studentData.assignments.find(
    (a) =>
      a.joinDate.getFullYear() <= year &&
      (!a.leaveDate || a.leaveDate.getFullYear() >= year),
  );

  const historicalClassroomId = relevantAssignment?.classroomId || null;

  let historicalTutorId = null;
  if (relevantAssignment) {
    const tutorAssignment = relevantAssignment.classroom.tutorAssignments.find(
      (ta) =>
        ta.startDate.getFullYear() <= year &&
        (!ta.endDate || ta.endDate.getFullYear() >= year),
    );
    historicalTutorId = tutorAssignment?.userId || null;
  }

  const updated = await prisma.boardExamResult.update({
    where: { id: resultId },
    data: {
      studentId,
      totalMarks,
      marksObtained,
      grade,
      classroomId: historicalClassroomId, 
      spTutorId: historicalTutorId, 
    },
    select: {
      id: true,
      studentId: true,
      passingYear: true,
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

  return NextResponse.json({
    id: updated.id,
    studentId: updated.studentId,
    studentName: updated.student.name,
    rollNo: updated.student.rollNo,
    schoolName: updated.student.schoolName,
    city: updated.student.city,
    state: updated.student.state,
    passingYear: updated.passingYear,
    totalMarks: updated.totalMarks,
    marksObtained: updated.marksObtained,
    percentage: round2((updated.marksObtained / updated.totalMarks) * 100),
    grade: updated.grade,
    classroomCode: updated.classroom?.code || null,
    tutorName: updated.spTutor?.name || null,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ resultId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { resultId } = await ctx.params;

  const exists = await prisma.boardExamResult.findUnique({
    where: { id: resultId },
    select: { id: true },
  });
  if (!exists) return new NextResponse("Result not found", { status: 404 });

  await prisma.boardExamResult.delete({ where: { id: resultId } });
  return new NextResponse(null, { status: 204 });
}

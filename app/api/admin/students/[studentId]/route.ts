import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { AssignmentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/admin/students/[studentId]
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ studentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { studentId } = await ctx.params;
  if (!studentId)
    return new NextResponse("Bad Request: missing studentId", { status: 400 });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assignments: {
        orderBy: { joinDate: "desc" },
        include: {
          classroom: {
            select: {
              id: true,
              code: true,
              centre: { select: { code: true, name: true } },
            },
          },
        },
      },
      boardResult: {
        select: {
          id: true,
          passingYear: true,
          totalMarks: true,
          marksObtained: true,
          grade: true,
          spTutorId: true,
          spTutor: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!student) return new NextResponse("Not Found", { status: 404 });

  return NextResponse.json(student);
}

// PUT /api/admin/students/[studentId]
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ studentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { studentId } = await ctx.params;
  if (!studentId)
    return new NextResponse("Bad Request: missing studentId", { status: 400 });

  const body = await req.json();

  // Build student update payload — only include fields that were sent
  const studentData: any = {};
  if (body.name !== undefined) studentData.name = String(body.name).trim();
  if (body.rollNo !== undefined)
    studentData.rollNo = String(body.rollNo).trim();
  if (body.aadhaarNo !== undefined)
    studentData.aadhaarNo = body.aadhaarNo
      ? String(body.aadhaarNo).trim()
      : null;
  if (body.gender !== undefined) studentData.gender = body.gender || null;
  if (body.dob !== undefined)
    studentData.dob = body.dob ? new Date(body.dob) : null;
  if (body.category !== undefined) studentData.category = body.category || null;
  if (body.schoolName !== undefined)
    studentData.schoolName = body.schoolName
      ? String(body.schoolName).trim()
      : null;
  if (body.schoolType !== undefined)
    studentData.schoolType = body.schoolType || null;
  if (body.fatherName !== undefined)
    studentData.fatherName = body.fatherName
      ? String(body.fatherName).trim()
      : null;
  if (body.motherName !== undefined)
    studentData.motherName = body.motherName
      ? String(body.motherName).trim()
      : null;
  if (body.parentPhone !== undefined)
    studentData.parentPhone = body.parentPhone
      ? String(body.parentPhone).trim()
      : null;
  if (body.streetAddress !== undefined)
    studentData.streetAddress = body.streetAddress
      ? String(body.streetAddress).trim()
      : null;
  if (body.city !== undefined)
    studentData.city = body.city ? String(body.city).trim() : null;
  if (body.district !== undefined)
    studentData.district = body.district ? String(body.district).trim() : null;
  if (body.state !== undefined)
    studentData.state = body.state ? String(body.state).trim() : null;
  if (body.pincode !== undefined)
    studentData.pincode = body.pincode ? String(body.pincode).trim() : null;
  if (body.admissionDate !== undefined)
    studentData.admissionDate = body.admissionDate
      ? new Date(body.admissionDate)
      : null;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Verify student exists
        const existing = await tx.student.findUnique({
          where: { id: studentId },
          select: { id: true },
        });
        if (!existing) throw new Error("Student not found");

        // Update core student profile
        const updated = await tx.student.update({
          where: { id: studentId },
          data: studentData,
        });

        // Handle classroom assignment change if classroomId is provided
        if (body.classroomId !== undefined) {
          const newClassroomId = body.classroomId
            ? String(body.classroomId).trim()
            : null;

          // Find current active assignment
          const currentAssignment =
            await tx.studentClassroomAssignment.findFirst({
              where: { studentId, status: AssignmentStatus.ACTIVE },
              orderBy: { joinDate: "desc" },
            });

          if (newClassroomId) {
            // Validate the classroom exists
            const classroom = await tx.classroom.findUnique({
              where: { id: newClassroomId },
              select: { id: true },
            });
            if (!classroom) throw new Error("Classroom not found");

            const joinDate = body.joinDate
              ? new Date(body.joinDate)
              : new Date();

            if (currentAssignment) {
              if (currentAssignment.classroomId !== newClassroomId) {
                // Close the old assignment, open a new one
                await tx.studentClassroomAssignment.update({
                  where: { id: currentAssignment.id },
                  data: {
                    status: AssignmentStatus.LEFT,
                    leaveDate: new Date(),
                  },
                });
                await tx.studentClassroomAssignment.create({
                  data: {
                    studentId,
                    classroomId: newClassroomId,
                    joinDate,
                    status: AssignmentStatus.ACTIVE,
                  },
                });
              }
              // If same classroom, no change needed
            } else {
              // No active assignment — create one
              await tx.studentClassroomAssignment.create({
                data: {
                  studentId,
                  classroomId: newClassroomId,
                  joinDate,
                  status: AssignmentStatus.ACTIVE,
                },
              });
            }
          } else {
            // classroomId is null/empty — close the current active assignment if any
            if (currentAssignment) {
              await tx.studentClassroomAssignment.update({
                where: { id: currentAssignment.id },
                data: {
                  status: AssignmentStatus.LEFT,
                  leaveDate: new Date(),
                },
              });
            }
          }
        }

        return updated;
      },
      { maxWait: 5000, timeout: 10000 },
    );

    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.message === "Student not found")
      return new NextResponse("Not Found", { status: 404 });
    if (e?.message === "Classroom not found")
      return new NextResponse("Classroom not found", { status: 404 });
    if (e?.code === "P2002") {
      const target = e?.meta?.target;
      if (Array.isArray(target) && target.includes("rollNo"))
        return new NextResponse("Roll No already in use", { status: 409 });
      if (
        typeof target === "string" &&
        target.includes("student_aadhaar_unique")
      )
        return new NextResponse("Aadhaar No already in use", { status: 409 });
      return new NextResponse("Duplicate entry", { status: 409 });
    }
    console.error("ADMIN_UPDATE_STUDENT_ERROR", e);
    return new NextResponse(e?.message || "Failed to update student", {
      status: 500,
    });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ studentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { studentId } = await ctx.params;
  if (!studentId)
    return new NextResponse("Bad Request: missing studentId", { status: 400 });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) return new NextResponse("Not Found", { status: 404 });

  try {
    // Cascade deletes (StudentClassroomAssignment, BoardExamResult) via Prisma schema onDelete: Cascade
    await prisma.student.delete({ where: { id: studentId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("ADMIN_DELETE_STUDENT_ERROR", e);
    return new NextResponse("Failed to delete student", { status: 500 });
  }
}

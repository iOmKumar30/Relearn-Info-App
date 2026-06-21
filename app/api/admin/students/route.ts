import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import {
  AssignmentStatus,
  Category,
  Gender,
  Prisma,
  SchoolType,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    1000,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );
  const q = (searchParams.get("q") || "").trim();
  const gender = (searchParams.get("gender") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const assignmentStatus = (searchParams.get("assignmentStatus") || "").trim();
  const schoolType = (searchParams.get("schoolType") || "").trim();
  const centreId = (searchParams.get("centreId") || "").trim();
  const classroomId = (searchParams.get("classroomId") || "").trim();

  const where: Prisma.StudentWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { rollNo: { contains: q, mode: "insensitive" } },
      { parentPhone: { contains: q, mode: "insensitive" } },
      { fatherName: { contains: q, mode: "insensitive" } },
      { motherName: { contains: q, mode: "insensitive" } },
      { schoolName: { contains: q, mode: "insensitive" } },
      { standard: { contains: q, mode: "insensitive" } },
    ];
  }

  if (gender) where.gender = gender as Gender;
  if (category) where.category = category as Category;
  if (schoolType) where.schoolType = schoolType as SchoolType;

  if (assignmentStatus || classroomId || centreId) {
    where.assignments = {
      some: {
        ...(assignmentStatus
          ? { status: assignmentStatus as AssignmentStatus }
          : {}),
        ...(classroomId ? { classroomId } : {}),
        ...(centreId
          ? {
              classroom: {
                centreId,
              },
            }
          : {}),
      },
    };
  }

  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        rollNo: true,
        aadhaarNo: true,
        gender: true,
        dob: true,
        category: true,
        schoolName: true,
        schoolType: true,
        standard: true,
        historicalTutorId: true,
        historicalTutor: {
          select: {
            name: true,
          },
        },
        fatherName: true,
        motherName: true,
        parentPhone: true,
        streetAddress: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        admissionDate: true,
        createdAt: true,
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          take: 1,
          orderBy: { joinDate: "desc" },
          select: {
            id: true,
            classroomId: true,
            joinDate: true,
            leaveDate: true,
            status: true,
            classroom: {
              select: {
                id: true,
                code: true,
                centre: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const mapped = rows.map((s) => ({
    ...s,
    activeAssignment: s.assignments[0] ?? null,
    assignments: undefined,
  }));

  return NextResponse.json({ page, pageSize, total, rows: mapped });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const rollNo = String(body?.rollNo ?? "").trim();
  const standard = body?.standard ? String(body.standard).trim() : null;

  if (!name) return new NextResponse("Name is required", { status: 400 });
  if (!rollNo) return new NextResponse("Roll No is required", { status: 400 });

  const classroomId = body?.classroomId
    ? String(body.classroomId).trim()
    : null;
  const joinDate = body?.joinDate ? new Date(body.joinDate) : new Date();

  let historicalTutorId = null;

  if (classroomId) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        tutorAssignments: {
          where: {
            endDate: null,
          },
          select: { userId: true },
        },
      },
    });
    if (!classroom)
      return new NextResponse("Classroom not found", { status: 404 });

    // Snapshot the active tutor at the time of joining
    historicalTutorId = classroom.tutorAssignments[0]?.userId || null;
  }

  try {
    const student = await prisma.$transaction(
      async (tx) => {
        const created = await tx.student.create({
          data: {
            name,
            rollNo,
            aadhaarNo: body?.aadhaarNo ?? null,
            gender: body?.gender ?? null,
            dob: body?.dob ? new Date(body.dob) : null,
            category: body?.category ?? null,
            schoolName: body?.schoolName ?? null,
            schoolType: body?.schoolType ?? null,
            standard,
            historicalTutorId,
            fatherName: body?.fatherName ?? null,
            motherName: body?.motherName ?? null,
            parentPhone: body?.parentPhone ?? null,
            streetAddress: body?.streetAddress ?? null,
            city: body?.city ?? null,
            district: body?.district ?? null,
            state: body?.state ?? null,
            pincode: body?.pincode ?? null,
            admissionDate: body?.admissionDate
              ? new Date(body.admissionDate)
              : null,
          },
          select: { id: true, name: true, rollNo: true },
        });

        if (classroomId) {
          await tx.studentClassroomAssignment.create({
            data: {
              studentId: created.id,
              classroomId,
              joinDate,
              status: AssignmentStatus.ACTIVE,
            },
          });
        }

        return created;
      },
      { maxWait: 5000, timeout: 10000 },
    );

    return NextResponse.json(student, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const target = e?.meta?.target;
      if (Array.isArray(target) && target.includes("rollNo"))
        return new NextResponse("Roll No already exists", { status: 409 });
      if (
        typeof target === "string" &&
        target.includes("student_aadhaar_unique")
      )
        return new NextResponse("Aadhaar No already exists", { status: 409 });
      return new NextResponse("Duplicate entry", { status: 409 });
    }
    console.error("ADMIN_CREATE_STUDENT_ERROR", e);
    return new NextResponse("Failed to create student", { status: 500 });
  }
}

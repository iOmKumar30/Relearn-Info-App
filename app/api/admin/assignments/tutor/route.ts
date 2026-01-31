import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get("classroomId") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );

  if (!classroomId && !userId) {
    return new NextResponse("Bad Request: classroomId or userId required", {
      status: 400,
    });
  }

  const where: any = {};
  if (classroomId) where.classroomId = classroomId;
  if (userId) where.userId = userId;

  const [total, rows] = await Promise.all([
    prisma.tutorAssignment.count({ where }),
    prisma.tutorAssignment.findMany({
      where,
      // cacheStrategy: { ttl: 60, swr: 60 },
      orderBy: [{ endDate: "asc" }, { startDate: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        classroomId: true,
        startDate: true,
        endDate: true,
        isSubstitute: true,
        user: { select: { id: true, name: true, email: true } },
        classroom: {
          select: {
            id: true,
            section: true,
            code: true,
            centre: { select: { code: true, name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ total, rows });
}

// Create assignment
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const userId = String(body?.userId || "").trim();
  const classroomId = String(body?.classroomId || "").trim();
  const startDateStr = String(body?.startDate || "").trim();
  const isSubstitute = Boolean(body?.isSubstitute);

  if (!userId || !classroomId) {
    return new NextResponse("userId and classroomId are required", {
      status: 400,
    });
  }

  // Optional: verify user has TUTOR role
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
    // cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (!u) return new NextResponse("User not found", { status: 404 });
  const currentRoles = u.roleHistory.map((h) => h.role.name);
  if (!currentRoles.includes("TUTOR")) {
    return new NextResponse("User is not a TUTOR", { status: 409 });
  }

  // Verify classroom
  const c = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true },
    // cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (!c) return new NextResponse("Classroom not found", { status: 404 });

  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  // Optional business rule: prevent overlapping active assignments for same classroom
  const overlapping = await prisma.tutorAssignment.findFirst({
    where: { classroomId, endDate: null },
    select: { id: true },
    // cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (overlapping && !isSubstitute) {
    return new NextResponse(
      "Classroom already has an active tutor assignment",
      { status: 409 },
    );
  }

  const created = await prisma.tutorAssignment.create({
    data: {
      userId,
      classroomId,
      startDate,
      endDate: null,
      isSubstitute,
    },
    select: {
      id: true,
      userId: true,
      classroomId: true,
      startDate: true,
      endDate: true,
      isSubstitute: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

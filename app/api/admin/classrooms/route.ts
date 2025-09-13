import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import {
  ClassroomStatus,
  ClassTiming,
  Prisma,
  SectionCode,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// RBAC: ADMIN only (server-side)
async function isAdmin(userId?: string) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  const names = u?.roleHistory?.map((h) => h.role.name) ?? [];
  return names.includes("ADMIN");
}

// Compose classroom code as "SNN-SEC-SS"
// - S: first letter of Centre.state (uppercased)
// - NN: numeric part extracted from Centre.code (e.g., SP01 -> 01)
// - SEC: JR | SR
// - SS: serial per (centreId, section), 2-digits starting at 01
async function generateClassroomCode(
  tx: Prisma.TransactionClient,
  centreId: string,
  section: SectionCode
) {
  const centre = await tx.centre.findUnique({
    where: { id: centreId },
    select: { code: true, state: true },
  });
  if (!centre) throw new Error("Centre not found for classroom creation");

  const stateLetter = (centre.state?.trim()?.[0] ?? "X").toUpperCase();

  // Extract trailing digits from centre.code; fallback to "01"
  const centreNum = (() => {
    const m = centre.code.match(/(\d+)\s*$/);
    const n = m ? parseInt(m[1], 10) : 1;
    return String(isNaN(n) ? 1 : n).padStart(2, "0");
  })();

  // Find the max existing serial for this centre+section by parsing code suffix
  const last = await tx.classroom.findFirst({
    where: { centreId, section },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  let nextSerial = 1;
  if (last?.code) {
    const parts = last.code.split("-");
    const serialStr = parts[2]; // expect "J01-JR-03" -> "03"
    const n = parseInt(serialStr, 10);
    if (!isNaN(n)) nextSerial = n + 1;
  }
  const serial = String(nextSerial).padStart(2, "0");

  return `${stateLetter}${centreNum}-${section}-${serial}`;
}

// GET /api/admin/classrooms?page=&pageSize=&q=&centreId=&section=&timing=&status=
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20))
  );
  const q = (searchParams.get("q") || "").trim();

  // Direct facet filters
  const centreId = searchParams.get("centreId") || undefined;
  const sectionParam = (searchParams.get("section") || "").toUpperCase();
  const timingParam = (searchParams.get("timing") || "").toUpperCase();
  const statusParam = (searchParams.get("status") || "").toUpperCase();

  const section =
    sectionParam === "JR" || sectionParam === "SR"
      ? (sectionParam as SectionCode)
      : undefined;

  const timing =
    timingParam === "MORNING" || timingParam === "EVENING"
      ? (timingParam as ClassTiming)
      : undefined;

  const status =
    statusParam === "ACTIVE" || statusParam === "INACTIVE"
      ? (statusParam as ClassroomStatus)
      : undefined;

  const where: Prisma.ClassroomWhereInput = {
    ...(centreId ? { centreId } : {}),
    ...(section ? { section } : {}),
    ...(timing ? { timing } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            // Optional enum matches from q
            (["JR", "SR"] as const).includes(q.toUpperCase() as any)
              ? ({
                  section: q.toUpperCase() as SectionCode,
                } as Prisma.ClassroomWhereInput)
              : undefined,
            (["MORNING", "EVENING"] as const).includes(q.toUpperCase() as any)
              ? ({
                  timing: q.toUpperCase() as ClassTiming,
                } as Prisma.ClassroomWhereInput)
              : undefined,
            (["ACTIVE", "INACTIVE"] as const).includes(q.toUpperCase() as any)
              ? ({
                  status: q.toUpperCase() as ClassroomStatus,
                } as Prisma.ClassroomWhereInput)
              : undefined,
            // Centre fields
            { centre: { name: { contains: q, mode: "insensitive" } } },
            { centre: { code: { contains: q, mode: "insensitive" } } },
            { centre: { state: { contains: q, mode: "insensitive" } } },
            { centre: { city: { contains: q, mode: "insensitive" } } },
            { centre: { district: { contains: q, mode: "insensitive" } } },
            { centre: { pincode: { contains: q, mode: "insensitive" } } },
          ].filter(Boolean) as Prisma.ClassroomWhereInput[],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.classroom.count({ where }),
    prisma.classroom.findMany({
      where,
      orderBy: [{ status: "asc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        centreId: true,
        centre: { select: { id: true, code: true, name: true, state: true } },
        section: true,
        timing: true,
        monthlyAllowance: true,
        status: true,
        dateCreated: true,
        dateClosed: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, rows });
}

// POST /api/admin/classrooms (create)
// Body: centreId, section, timing, monthlyAllowance, status?, dateCreated?, dateClosed?
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const centreId = String(body?.centreId ?? "").trim();
  const section = body?.section as SectionCode;
  const timing = body?.timing as ClassTiming;
  const monthlyAllowance = Number(body?.monthlyAllowance ?? 0);
  const status = (body?.status as ClassroomStatus) ?? ClassroomStatus.ACTIVE;
  const dateCreated = body?.dateCreated
    ? new Date(body.dateCreated)
    : new Date();
  const dateClosed = body?.dateClosed ? new Date(body.dateClosed) : null;

  if (!centreId || !section || !timing || isNaN(monthlyAllowance)) {
    return new NextResponse("Missing/invalid fields", { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const code = await generateClassroomCode(tx, centreId, section);

      const row = await tx.classroom.create({
        data: {
          code,
          centreId,
          section,
          timing,
          monthlyAllowance,
          status,
          dateCreated,
          dateClosed,
        },
        select: {
          id: true,
          code: true,
          centreId: true,
          section: true,
          timing: true,
          monthlyAllowance: true,
          status: true,
          dateCreated: true,
          dateClosed: true,
          createdAt: true,
        },
      });

      return row;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("CLASSROOM_CREATE_ERROR", err);
    return new NextResponse("Failed to create Classroom", { status: 500 });
  }
}

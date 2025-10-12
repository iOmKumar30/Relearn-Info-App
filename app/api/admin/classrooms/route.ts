import { authOptions } from "@/libs/authOptions";
import { generateClassroomCode } from "@/libs/classroomCode";
import prisma from "@/libs/prismadb";
import {
  ClassroomStatus,
  ClassTiming,
  SectionCode,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdmin } from "@/libs/isAdmin";

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
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );
  const q = (searchParams.get("q") || "").trim();

  // Direct facet filters
  const centreIdRaw = searchParams.get("centreId") || undefined;
  let centreIds: string[] | undefined = undefined;
  if (centreIdRaw) {
    if (centreIdRaw.includes(",")) {
      centreIds = centreIdRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      centreIds = [centreIdRaw];
    }
  }
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
    ...(centreIds ? { centreId: { in: centreIds } } : {}),
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
        streetAddress: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
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
  const streetAddress = String(body?.streetAddress ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const district = String(body?.district ?? "").trim();
  const state = String(body?.state ?? "").trim();
  const pincode = String(body?.pincode ?? "").trim();
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
          streetAddress,
          city,
          district,
          state,
          pincode,
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
          streetAddress: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
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

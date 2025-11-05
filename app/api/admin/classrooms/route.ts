export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { authOptions } from "@/libs/authOptions";
import { generateClassroomCode } from "@/libs/classroomCode";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";

import {
  ClassroomStatus,
  ClassTiming,
  Prisma,
  SectionCode,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
// @ts-ignore
console.log("prisma import type:", typeof prisma);

// GET /api/admin/classrooms?page=&pageSize=&q=&centreId=&section=&timing=&status=
// GET /api/admin/classrooms?page=&pageSize=&q=&centreId=&centreCode=&section=&timing=&status=
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
  const qRaw = (searchParams.get("q") || "").trim();

  // Independent filters
  const centreIdRaw = searchParams.get("centreId") || ""; // comma-separated Centre IDs
  const centreCodeRaw = searchParams.get("centreCode") || ""; // comma-separated Centre codes (e.g., JH01, WB02)

  // Parse centreId list (IDs)
  const centreIdList = centreIdRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Parse centreCode list and resolve to IDs
  let centreIdsFromCodes: string[] = [];
  if (centreCodeRaw) {
    const codes = centreCodeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (codes.length > 0) {
      const centres = await prisma.centre.findMany({
        where: { code: { in: codes } },
        select: { id: true },
      });
      centreIdsFromCodes = centres.map((c) => c.id);
    }
  }

  // Combine centreId filters if both provided
  let finalCentreIds: string[] | undefined = undefined;
  if (centreIdList.length > 0 && centreIdsFromCodes.length > 0) {
    // Intersection if both params are given
    const set = new Set(centreIdList);
    finalCentreIds = centreIdsFromCodes.filter((id) => set.has(id));
    if (finalCentreIds.length === 0) {
      return NextResponse.json({ page, pageSize, total: 0, rows: [] });
    }
  } else if (centreIdList.length > 0) {
    finalCentreIds = centreIdList;
  } else if (centreIdsFromCodes.length > 0) {
    finalCentreIds = centreIdsFromCodes;
  }

  // Enum params
  const sectionParam = (searchParams.get("section") || "").toUpperCase();
  const timingParam = (searchParams.get("timing") || "").toUpperCase();
  const statusParam = (searchParams.get("status") || "").toUpperCase();

  const validSections = new Set(["JR", "SR", "BOTH"]);
  const section = validSections.has(sectionParam)
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

  // Text query facets
  const q = qRaw;
  const qUp = q.toUpperCase();

  const where: Prisma.ClassroomWhereInput = {
    ...(finalCentreIds ? { centreId: { in: finalCentreIds } } : {}),
    ...(section ? { section } : {}),
    ...(timing ? { timing } : {}),
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            validSections.has(qUp)
              ? ({ section: qUp as SectionCode } as Prisma.ClassroomWhereInput)
              : undefined,
            (["MORNING", "EVENING"] as const).includes(qUp as any)
              ? ({ timing: qUp as ClassTiming } as Prisma.ClassroomWhereInput)
              : undefined,
            (["ACTIVE", "INACTIVE"] as const).includes(qUp as any)
              ? ({
                  status: qUp as ClassroomStatus,
                } as Prisma.ClassroomWhereInput)
              : undefined,
            { streetAddress: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { district: { contains: q, mode: "insensitive" } },
            { pincode: { contains: q, mode: "insensitive" } },
            {
              tutorAssignments: {
                some: {
                  endDate: null,
                  user: {
                    OR: [
                      { name: { contains: q, mode: "insensitive" } },
                      { email: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
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
        tutorAssignments: {
          where: { endDate: null },
          take: 1,
          orderBy: { startDate: "desc" },
          select: {
            id: true,
            isSubstitute: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
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
      const code = await generateClassroomCode(tx, centreId);

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

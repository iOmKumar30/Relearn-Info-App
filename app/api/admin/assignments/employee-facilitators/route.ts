import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET by employeeUserId or facilitatorId
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const employeeUserId = searchParams.get("employeeUserId") || undefined;
  const facilitatorId = searchParams.get("facilitatorId") || undefined;
  if (!employeeUserId && !facilitatorId) {
    return new NextResponse(
      "Bad Request: employeeUserId or facilitatorId required",
      { status: 400 },
    );
  }

  const where: any = {};
  if (employeeUserId) where.employeeUserId = employeeUserId;
  if (facilitatorId) where.facilitatorId = facilitatorId;

  const rows = await prisma.facilitatorEmployee.findMany({
    where,
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      facilitatorId: true,
      employeeUserId: true,
      startDate: true,
      facilitator: { select: { id: true, name: true, email: true } },
      employee: { select: { id: true, name: true, email: true } },
    },
    // // cacheStrategy: { ttl: 60, swr: 60 },
  });

  return NextResponse.json({ rows });
}

// POST create link employee -> facilitator
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const employeeUserId = String(body?.employeeUserId || "").trim();
  const facilitatorId = String(body?.facilitatorId || "").trim();
  const startDateStr = String(body?.startDate || "").trim();

  if (!employeeUserId || !facilitatorId) {
    return new NextResponse("employeeUserId and facilitatorId are required", {
      status: 400,
    });
  }

  // Verify roles
  const employee = await prisma.user.findUnique({
    where: { id: employeeUserId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
    // // cacheStrategy: { ttl: 60, swr: 60 },
  });
  const eRoles = employee?.roleHistory?.map((h) => h.role.name) ?? [];
  if (!eRoles.includes("RELF_EMPLOYEE")) {
    return new NextResponse("User is not an EMPLOYEE", { status: 409 });
  }

  const facilitator = await prisma.user.findUnique({
    where: { id: facilitatorId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
    // // cacheStrategy: { ttl: 60, swr: 60 },
  });
  const fRoles = facilitator?.roleHistory?.map((h) => h.role.name) ?? [];
  if (!fRoles.includes("FACILITATOR")) {
    return new NextResponse("Target is not a FACILITATOR", { status: 409 });
  }

  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  const created = await prisma.facilitatorEmployee.create({
    data: { employeeUserId, facilitatorId, startDate },
    select: {
      id: true,
      employeeUserId: true,
      facilitatorId: true,
      startDate: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

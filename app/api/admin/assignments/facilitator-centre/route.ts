import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Check if a user is ADMIN based on current roleHistory
 */
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

// GET ?facilitatorId=... or ?centreId=...; list facilitator↔centre links
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const facilitatorId = searchParams.get("facilitatorId") || undefined;
  const centreId = searchParams.get("centreId") || undefined;

  if (!facilitatorId && !centreId) {
    return new NextResponse("Bad Request: facilitatorId or centreId required", {
      status: 400,
    });
  }

  // FacilitatorAssignment represents facilitator ↔ centre temporal link
  const where: any = {};
  if (facilitatorId) where.userId = facilitatorId;
  if (centreId) where.centreId = centreId;

  const rows = await prisma.facilitatorAssignment.findMany({
    where,
    orderBy: [{ endDate: "asc" }, { startDate: "desc" }],
    select: {
      id: true,
      userId: true,
      centreId: true,
      startDate: true,
      endDate: true,
      user: { select: { id: true, name: true, email: true } },
      centre: { select: { id: true, code: true, name: true } },
    },
  });

  return NextResponse.json({ rows });
}

// POST create new link
// New rule: one centre can have only one active facilitator (endDate null).
// A facilitator can have multiple active centre assignments.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const facilitatorId = String(body?.facilitatorId || "").trim();
  const centreId = String(body?.centreId || "").trim();
  const startDateStr = String(body?.startDate || "").trim();

  if (!facilitatorId || !centreId) {
    return new NextResponse("facilitatorId and centreId are required", {
      status: 400,
    });
  }

  // Verify facilitator role
  const fac = await prisma.user.findUnique({
    where: { id: facilitatorId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  const roles = fac?.roleHistory?.map((h) => h.role.name) ?? [];
  if (!roles.includes("FACILITATOR")) {
    return new NextResponse("User is not a FACILITATOR", { status: 409 });
  }

  // Verify centre exists
  const centre = await prisma.centre.findUnique({
    where: { id: centreId },
    select: { id: true },
  });
  if (!centre) {
    return new NextResponse("Centre not found", { status: 404 });
  }

  // Enforce: this centre must not already have an active facilitator
  // i.e., no FacilitatorAssignment for this centre with endDate null
  const activeForCentre = await prisma.facilitatorAssignment.findFirst({
    where: { centreId, endDate: null },
    select: { id: true, userId: true },
  });
  if (activeForCentre) {
    return new NextResponse(
      "Centre already has an active facilitator assignment",
      { status: 409 }
    );
  }

  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  // This reduces race conditions between the check and create.
  const created = await prisma
    .$transaction(async (tx) => {
      const stillFree = await tx.facilitatorAssignment.findFirst({
        where: { centreId, endDate: null },
        select: { id: true },
      });
      if (stillFree) {
        throw new Error("CENTRE_ACTIVE_ALREADY");
      }
      return tx.facilitatorAssignment.create({
        data: { userId: facilitatorId, centreId, startDate, endDate: null },
        select: {
          id: true,
          userId: true,
          centreId: true,
          startDate: true,
          endDate: true,
        },
      });
    })
    .catch((err) => {
      if (String(err?.message) === "CENTRE_ACTIVE_ALREADY") {
        throw new NextResponse(
          "Centre already has an active facilitator assignment",
          { status: 409 }
        );
      }
      throw err;
    });

  return NextResponse.json(created, { status: 201 });
}

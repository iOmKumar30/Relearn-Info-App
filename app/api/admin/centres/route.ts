import { authOptions } from "@/libs/authOptions";
import { nextCentreCodeForState } from "@/libs/centres/codeGen";
import { STATE_CODES } from "@/libs/geo/stateCodes";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { CentreStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/admin/centres?page=&pageSize=&q=&status=&state=&city=&district=

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
  const statusParam = (searchParams.get("status") || "").toUpperCase();
  const status =
    statusParam === "ACTIVE" || statusParam === "INACTIVE"
      ? (statusParam as CentreStatus)
      : undefined;

  const state = searchParams.get("state") || undefined;
  const city = searchParams.get("city") || undefined;
  const district = searchParams.get("district") || undefined;

  const where: Prisma.CentreWhereInput = {
    ...(status ? { status } : {}),
    ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    ...(district
      ? { district: { equals: district, mode: "insensitive" } }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { district: { contains: q, mode: "insensitive" } },
            { state: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { pincode: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.centre.count({ where }),
    prisma.centre.findMany({
      where,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        streetAddress: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        status: true,
        dateAssociated: true,
        dateLeft: true,
        createdAt: true,
        updatedAt: true,

        // Include current (active) facilitator assignment, most recent by startDate
        facilitatorLinks: {
          where: { endDate: null },
          orderBy: { startDate: "desc" },
          take: 1,
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            startDate: true,
            endDate: true,
          },
        },
      },
    }),
  ]);

  // Flatten for convenience: expose facilitator as a single object or null
  const shaped = rows.map((c:any) => {
    const currentFac = c.facilitatorLinks?.[0]
      ? {
          assignmentId: c.facilitatorLinks[0].id,
          userId: c.facilitatorLinks[0].user.id,
          name: c.facilitatorLinks[0].user.name,
          email: c.facilitatorLinks[0].user.email,
          startDate: c.facilitatorLinks[0].startDate,
        }
      : null;

    // Strip facilitatorLinks array if you prefer a flatter response
    const { facilitatorLinks, ...rest } = c;
    return { ...rest, facilitator: currentFac };
  });

  return NextResponse.json({ page, pageSize, total, rows: shaped });
}

// POST /api/admin/centres (create)

function resolveCodeFromFullName(fullName: string): string | null {
  const normalized = fullName.trim().toLowerCase();
  for (const [code, name] of Object.entries(STATE_CODES)) {
    if (name.toLowerCase() === normalized) return code;
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const streetAddress = String(body?.streetAddress ?? "").trim();

  const stateFullName = String(body?.state ?? "").trim();

  const pincode = String(body?.pincode ?? "").trim();
  const city = body?.city ? String(body.city).trim() : null;
  const district = body?.district ? String(body.district).trim() : null;
  const status = (body?.status as CentreStatus) ?? CentreStatus.ACTIVE;
  const dateAssociated = body?.dateAssociated
    ? new Date(body.dateAssociated)
    : new Date();
  const dateLeft = body?.dateLeft ? new Date(body.dateLeft) : null;

  if (!name || !streetAddress || !stateFullName || !pincode) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // Map full name -> 2-letter code for code generation
  const stateCode = resolveCodeFromFullName(stateFullName);
  if (!stateCode) {
    return new NextResponse("Invalid state name", { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Use the state code for generating sequential centre code
      const code = await nextCentreCodeForState(stateCode);

      // Persist the human-readable full state name in DB (adjust if your schema wants the code)
      const row = await tx.centre.create({
        data: {
          code,
          name,
          streetAddress,
          city,
          district,
          state: stateFullName, // store full name as requested
          pincode,
          status,
          dateAssociated,
          dateLeft,
        },
        select: {
          id: true,
          code: true,
          name: true,
          streetAddress: true,
          city: true,
          district: true,
          state: true, // returns full name
          pincode: true,
          status: true,
          dateAssociated: true,
          dateLeft: true,
          createdAt: true,
        },
      });

      return row;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("CENTRE_CREATE_ERROR", err);
    return new NextResponse("Failed to create Centre", { status: 500 });
  }
}

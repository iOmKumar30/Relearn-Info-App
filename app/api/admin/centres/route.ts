import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { CentreStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Simple sequential code generator "SP01", "SP02", ...
async function generateCentreCode() {
  const last = await prisma.centre.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const prefix = "SP";
  const width = 2;
  let nextNum = 1;
  if (last?.code?.startsWith(prefix)) {
    const num = parseInt(last.code.slice(prefix.length), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  const padded = String(nextNum).padStart(width, "0");
  return `${prefix}${padded}`;
}

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
      },
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, rows });
}

// POST /api/admin/centres  (create)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const streetAddress = String(body?.streetAddress ?? "").trim();
  const state = String(body?.state ?? "").trim();
  const pincode = String(body?.pincode ?? "").trim();
  const city = body?.city ? String(body.city).trim() : null;
  const district = body?.district ? String(body.district).trim() : null;
  const status = (body?.status as CentreStatus) ?? CentreStatus.ACTIVE;
  const dateAssociated = body?.dateAssociated
    ? new Date(body.dateAssociated)
    : new Date();
  const dateLeft = body?.dateLeft ? new Date(body.dateLeft) : null;

  if (!name || !streetAddress || !state || !pincode) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const code = await generateCentreCode();

      const row = await tx.centre.create({
        data: {
          code,
          name,
          streetAddress,
          city,
          district,
          state,
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
          state: true,
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

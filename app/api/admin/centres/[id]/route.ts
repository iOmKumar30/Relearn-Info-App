import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { CentreStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/admin/centres/:id
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  const row = await prisma.centre.findUnique({
    where: { id },
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
    cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (!row) return new NextResponse("Not Found", { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/admin/centres/:id  (update user-editable fields only)
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await ctx.params;
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();

  // Only allow editable fields (code is backend-managed and immutable)
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.streetAddress !== undefined)
    data.streetAddress = String(body.streetAddress).trim();
  if (body.city !== undefined)
    data.city = body.city ? String(body.city).trim() : null;
  if (body.district !== undefined)
    data.district = body.district ? String(body.district).trim() : null;
  if (body.state !== undefined) data.state = String(body.state).trim();
  if (body.pincode !== undefined) data.pincode = String(body.pincode).trim();
  if (body.status !== undefined) data.status = body.status as CentreStatus;
  if (body.dateAssociated !== undefined)
    data.dateAssociated = body.dateAssociated
      ? new Date(body.dateAssociated)
      : new Date();
  if (body.dateLeft !== undefined)
    data.dateLeft = body.dateLeft ? new Date(body.dateLeft) : null;

  try {
    const updated = await prisma.centre.update({
      where: { id },
      data,
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
        updatedAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return new NextResponse("Not Found", { status: 404 });
  }
}

// DELETE /api/admin/centres/:id
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;

  // prevent deletion if classrooms exist; enforce referential policy
  const classrooms = await prisma.classroom.count({ where: { centreId: id } });
  if (classrooms > 0) {
    return new NextResponse(
      "Cannot delete Centre with existing Classrooms. Close or reassign them first.",
      { status: 409 }
    );
  }

  try {
    await prisma.centre.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return new NextResponse("Not Found", { status: 404 });
  }
}

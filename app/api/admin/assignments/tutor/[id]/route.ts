import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id?: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!id) return new NextResponse("Bad Request: missing id", { status: 400 });

  const body = await req.json().catch(() => ({}));
  const dataToUpdate: any = {};
  if (body.startDate !== undefined) {
    dataToUpdate.startDate = new Date(String(body.startDate));
  }
  if (body.endDate !== undefined) {
    dataToUpdate.endDate = body.endDate ? new Date(String(body.endDate)) : null;
  }
  if (body.isSubstitute !== undefined) {
    dataToUpdate.isSubstitute = Boolean(body.isSubstitute);
  }
  if (Object.keys(dataToUpdate).length === 0) {
    return new NextResponse("No fields to update", { status: 400 });
  }
  try {
    const updated = await prisma.tutorAssignment.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, startDate: true, endDate: true },
    });
    return NextResponse.json(updated);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id?: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!id) return new NextResponse("Bad Request: missing id", { status: 400 });

  try {
    await prisma.tutorAssignment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

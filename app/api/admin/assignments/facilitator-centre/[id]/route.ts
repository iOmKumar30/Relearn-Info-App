import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id?: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!id) return new NextResponse("Bad Request: missing id", { status: 400 });

  const body = await req.json().catch(() => ({}));

  const data: any = {};

  if (body.startDate) {
    data.startDate = new Date(body.startDate);
  }

  if (body.endDate !== undefined) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }

  try {
    const updated = await prisma.facilitatorAssignment.update({
      where: { id },
      data,
      select: { id: true, startDate: true, endDate: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return new NextResponse("Failed to update or Not Found", { status: 500 });
  }
}
// Hard delete
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!id) return new NextResponse("Bad Request: missing id", { status: 400 });

  try {
    await prisma.facilitatorAssignment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

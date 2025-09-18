// app/api/admin/assignments/tutor/[id]/route.ts
import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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

// Close (end) assignment
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!id) return new NextResponse("Bad Request: missing id", { status: 400 });

  const body = await req.json().catch(() => ({}));
  const endDate = body?.endDate ? new Date(String(body.endDate)) : new Date();

  try {
    const updated = await prisma.tutorAssignment.update({
      where: { id },
      data: { endDate },
      select: { id: true, endDate: true },
    });
    return NextResponse.json(updated);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

// Hard delete assignment
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id?: string }> }
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

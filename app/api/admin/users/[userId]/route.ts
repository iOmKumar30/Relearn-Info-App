import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function isAdmin(userId?: string) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleHistory: { where: { endDate: null }, include: { role: true } },
    },
  });
  const names = u?.roleHistory?.map((h) => h.role.name) ?? [];
  return names.includes("ADMIN");
}

// GET one
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      status: true,
      onboardingStatus: true,
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  if (!u) return new NextResponse("Not Found", { status: 404 });
  return NextResponse.json({
    ...u,
    roles: u.roleHistory.map((h) => h.role.name),
  });
}

// PUT update profile/status (not roles here)
export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;
  const body = await req.json();

  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.phone !== undefined)
    data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.address !== undefined)
    data.address = body.address ? String(body.address).trim() : null;
  if (body.status !== undefined) data.status = body.status as UserStatus;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        onboardingStatus: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

// DELETE
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;

  try {
    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

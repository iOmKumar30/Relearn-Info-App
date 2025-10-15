import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET one
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId?: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { userId } = await ctx.params; // ✅ await params
  if (!userId)
    return new NextResponse("Bad Request: missing userId", { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
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
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!u) return new NextResponse("Not Found", { status: 404 });

  const currentRoles = (u.roleHistory ?? []).map((h) => h.role.name);
  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    status: u.status,
    onboardingStatus: u.onboardingStatus,
    currentRoles,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });
}

// PUT update profile/status (not roles here)
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { userId } = await ctx.params;
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
      where: { id: userId },
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
export async function DELETE(
  _req: Request,
  ctx: { params: { userId?: string } } // param key matches folder [userId]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const userId = ctx.params.userId;
  if (!userId)
    return new NextResponse("Bad Request: missing userId", { status: 400 });

  // Ensure user exists to return 404 consistently if not
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return new NextResponse("Not Found", { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Auth-related relations in your schema
      await tx.emailCredential.deleteMany({ where: { userId } }); // EmailCredential
      await tx.account.deleteMany({ where: { userId } }); // Account (OAuth/OIDC)
      // Finally delete the User
      await tx.user.delete({ where: { id: userId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    // If concurrent delete or not found mid-transaction, respond idempotently
    return new NextResponse("Not Found", { status: 404 });
  }
}

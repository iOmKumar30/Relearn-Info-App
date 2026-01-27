import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { RoleName, UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET one
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId?: string }> },
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
    cacheStrategy: { ttl: 60, swr: 60 },
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

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { userId } = await ctx.params;
  const body = await req.json();

  const userData: any = {};
  if (body.name !== undefined) userData.name = String(body.name).trim();
  if (body.phone !== undefined)
    userData.phone = body.phone ? String(body.phone).trim() : null;
  if (body.address !== undefined)
    userData.address = body.address ? String(body.address).trim() : null;
  if (body.status !== undefined) userData.status = body.status as UserStatus;

  if (body.email !== undefined) {
    const newEmail = String(body.email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existing && existing.id !== userId) {
      return new NextResponse("Email already in use", { status: 409 });
    }
    userData.email = newEmail;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...userData,
          ...(userData.email
            ? {
                emailCredential: {
                  update: {
                    email: userData.email,
                  },
                },
              }
            : {}),
        },
      });

      if (body.roles !== undefined && Array.isArray(body.roles)) {
        const newRoles: RoleName[] = body.roles;

        const currentRoleHistory = await tx.userRoleHistory.findMany({
          where: {
            userId: userId,
            endDate: null,
          },
          include: { role: true },
        });

        const currentRoleNames = currentRoleHistory.map((h) => h.role.name);

        const rolesToAdd = newRoles.filter(
          (r) => !currentRoleNames.includes(r),
        );

        const rolesToRemove = currentRoleNames.filter(
          (r) => !newRoles.includes(r),
        );

        if (rolesToRemove.length > 0) {
          await tx.userRoleHistory.updateMany({
            where: {
              userId: userId,
              endDate: null,
              role: { name: { in: rolesToRemove } },
            },
            data: { endDate: new Date() },
          });
        }

        if (rolesToAdd.length > 0) {
          const roleRecords = await tx.role.findMany({
            where: { name: { in: rolesToAdd } },
          });

          await tx.userRoleHistory.createMany({
            data: roleRecords.map((role) => ({
              userId: userId,
              roleId: role.id,
              startDate: new Date(),
            })),
          });
        }
      }

      const finalUser = await tx.user.findUnique({
        where: { id: userId },
        include: {
          roleHistory: {
            where: { endDate: null },
            include: { role: true },
          },
        },
      });

      if (!finalUser) throw new Error("User not found after update");

      return {
        ...finalUser,
        roles: finalUser.roleHistory.map((h) => h.role.name),
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    if (e.code === "P2002") {
      return new NextResponse("Email already exists", { status: 409 });
    }
    console.error("Update Error:", e);
    return new NextResponse("Failed to update user", { status: 500 });
  }
}
// DELETE
export async function DELETE(
  _req: Request,
  ctx: { params: { userId?: string } }, 
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
    cacheStrategy: { ttl: 60, swr: 60 },
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

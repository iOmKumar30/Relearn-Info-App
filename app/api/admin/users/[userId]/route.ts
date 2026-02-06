import { authOptions } from "@/libs/authOptions";
import { generateNextMemberId } from "@/libs/idGenerator";
import { isAdmin } from "@/libs/isAdmin";
import { swapMemberIdPrefix } from "@/libs/memberIdUtils";
import prisma from "@/libs/prismadb";
import { MemberStatus, MemberType, RoleName, UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// PUT: Update User + Handle Member Type Changes
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
  if (body.gender !== undefined) userData.gender = body.gender || null;
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

  // Extract member-specific fields
  const memberTypeInput = body.memberType as MemberType | undefined;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update User Core Data
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

      // 2. Handle Roles
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

        // A. Remove Roles
        if (rolesToRemove.length > 0) {
          await tx.userRoleHistory.updateMany({
            where: {
              userId: userId,
              endDate: null,
              role: { name: { in: rolesToRemove } },
            },
            data: { endDate: new Date() },
          });

          // Edge Case: If MEMBER role is removed, set Member record to INACTIVE
          if (rolesToRemove.includes("MEMBER")) {
            await tx.member.updateMany({
              where: { userId: userId },
              data: { status: MemberStatus.INACTIVE },
            });
            // Also close active type history
            const memberRecord = await tx.member.findUnique({
              where: { userId },
            });
            if (memberRecord) {
              await tx.memberTypeHistory.updateMany({
                where: { memberId: memberRecord.id, endDate: null },
                data: { endDate: new Date() },
              });
            }
          }
        }

        // B. Add Roles
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

        // 3. Handle Member Record Updates (If MEMBER role is active/added)
        const isMemberNow = newRoles.includes("MEMBER");

        if (isMemberNow && memberTypeInput) {
          const existingMember = await tx.member.findUnique({
            where: { userId },
          });

          if (!existingMember) {
            // CREATE NEW MEMBER
            // (User wasn't a member before, but now has MEMBER role)
            const memberId = await generateNextMemberId(tx, memberTypeInput);
            const newMember = await tx.member.create({
              data: {
                userId: userId,
                memberId: memberId,
                memberType: memberTypeInput,
                joiningDate: new Date(),
                status: MemberStatus.ACTIVE,
                pan: null, // or pass from body if available
              },
            });

            await tx.memberTypeHistory.create({
              data: {
                memberId: newMember.id,
                memberType: memberTypeInput,
                startDate: new Date(),
                endDate: null,
                changedBy: session.user.id,
              },
            });
          } else {
            // UPDATE EXISTING MEMBER
            // 1. Reactivate if it was inactive
            if (existingMember.status !== MemberStatus.ACTIVE) {
              await tx.member.update({
                where: { id: existingMember.id },
                data: { status: MemberStatus.ACTIVE },
              });
            }

            // 2. Handle Type Change (e.g., ANNUAL -> LIFE)
            // Only if the type is different AND valid
            if (existingMember.memberType !== memberTypeInput) {
              const newMemberId = swapMemberIdPrefix(
                existingMember.memberId,
                memberTypeInput,
              );
              // Close old history
              await tx.memberTypeHistory.updateMany({
                where: { memberId: existingMember.id, endDate: null },
                data: { endDate: new Date() },
              });

              // Update Member Record
              // Note: We usually don't change the memberId prefix automatically here
              // unless strictly required, but we update the type.
              await tx.member.update({
                where: { id: existingMember.id },
                data: {
                  memberType: memberTypeInput,
                  memberId: newMemberId,
                },
              });

              // Create new history
              await tx.memberTypeHistory.create({
                data: {
                  memberId: existingMember.id,
                  memberType: memberTypeInput,
                  startDate: new Date(),
                  endDate: null,
                  changedBy: session.user.id,
                },
              });
            }
          }
        }
      }

      // Fetch final user state
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
  ctx: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { userId } = await ctx.params;

  if (!userId)
    return new NextResponse("Bad Request: missing userId", { status: 400 });

  // Ensure user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return new NextResponse("Not Found", { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      // Auth-related relations
      await tx.emailCredential.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });

      // Note: Member/RoleHistory relations delete via Cascade automatically
      // But we can explicit delete if needed.
      // Since schema usually has onDelete: Cascade for user->member, this is fine.

      await tx.user.delete({ where: { id: userId } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return new NextResponse("Not Found", { status: 404 });
  }
}

import { authOptions } from "@/libs/authOptions";
import { generateNextMemberId } from "@/libs/idGenerator";
import { isAdmin } from "@/libs/isAdmin";
import { swapMemberIdPrefix } from "@/libs/memberIdUtils";
import prisma from "@/libs/prismadb";
import {
  InternStatus,
  MemberStatus,
  MemberType,
  RoleName,
  UserStatus,
} from "@prisma/client";
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

  const memberTypeInput = body.memberType as MemberType | undefined;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // STEP 1: Fetch user state BEFORE update + role history in parallel
        const [userBeforeUpdate, currentRoleHistory] = await Promise.all([
          tx.user.findUnique({
            where: { id: userId },
            select: { status: true },
          }),
          body.roles !== undefined
            ? tx.userRoleHistory.findMany({
                where: { userId: userId, endDate: null },
                include: { role: true },
              })
            : Promise.resolve([]),
        ]);

        if (!userBeforeUpdate) {
          throw new Error("User not found");
        }

        // Decide whether to update EmailCredential (local auth only)
        let shouldUpdateEmailCredential = false;
        if (userData.email) {
          const existingEmailCred = await tx.emailCredential.findUnique({
            where: { userId },
          });
          shouldUpdateEmailCredential = !!existingEmailCred;
        }

        // STEP 2: Update user core data
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            ...userData,
            ...(userData.email && shouldUpdateEmailCredential
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

        // STEP 3: Detect status change to INACTIVE
        const statusChangedToInactive =
          userBeforeUpdate.status !== UserStatus.INACTIVE &&
          userData.status === UserStatus.INACTIVE;

        // STEP 4: Cascade on INACTIVE
        if (statusChangedToInactive) {
          const now = new Date();

          await Promise.all([
            tx.facilitatorAssignment.updateMany({
              where: { userId: userId, endDate: null },
              data: { endDate: now },
            }),
            tx.tutorAssignment.updateMany({
              where: { userId: userId, endDate: null },
              data: { endDate: now },
            }),
            tx.userRoleHistory.updateMany({
              where: { userId: userId, endDate: null },
              data: { endDate: now },
            }),
          ]);

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
            roles: [],
          };
        }

        // STEP 5: Handle roles (only if user not inactive)
        if (body.roles !== undefined && Array.isArray(body.roles)) {
          const newRoles: RoleName[] = body.roles;
          const currentRoleNames = currentRoleHistory.map((h) => h.role.name);

          const rolesToAdd = newRoles.filter(
            (r) => !currentRoleNames.includes(r),
          );
          const rolesToRemove = currentRoleNames.filter(
            (r) => !newRoles.includes(r),
          );

          // Fetch role records for rolesToAdd
          let roleRecordsToAdd: any[] = [];
          if (rolesToAdd.length > 0) {
            if (updatedUser.status === UserStatus.INACTIVE) {
              throw new Error("Cannot add roles to an inactive user");
            }

            roleRecordsToAdd = await tx.role.findMany({
              where: { name: { in: rolesToAdd } },
            });
          }

          const roleOperations: Promise<any>[] = [];

          // Remove roles
          if (rolesToRemove.length > 0) {
            roleOperations.push(
              tx.userRoleHistory.updateMany({
                where: {
                  userId: userId,
                  endDate: null,
                  role: { name: { in: rolesToRemove } },
                },
                data: { endDate: new Date() },
              }),
            );

            if (rolesToRemove.includes("MEMBER")) {
              roleOperations.push(
                tx.member.updateMany({
                  where: { userId: userId },
                  data: { status: MemberStatus.INACTIVE },
                }),
              );
            }
          }

          // Add roles
          if (roleRecordsToAdd.length > 0) {
            roleOperations.push(
              tx.userRoleHistory.createMany({
                data: roleRecordsToAdd.map((role) => ({
                  userId: userId,
                  roleId: role.id,
                  startDate: new Date(),
                })),
              }),
            );
          }

          if (roleOperations.length > 0) {
            await Promise.all(roleOperations);
          }

          // Member role removal cascade
          if (rolesToRemove.includes("MEMBER")) {
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

          // STEP 6: Handle Member (ANNUAL/LIFE/HONORARY/INTERN)
          const isMemberNow = newRoles.includes("MEMBER");

          if (isMemberNow && memberTypeInput) {
            const existingMember = await tx.member.findUnique({
              where: { userId },
            });

            if (!existingMember) {
              // New Member
              const memberId = await generateNextMemberId(tx, memberTypeInput);
              const newMember = await tx.member.create({
                data: {
                  userId,
                  memberId,
                  memberType: memberTypeInput,
                  joiningDate: new Date(),
                  status: MemberStatus.ACTIVE,
                  pan: null,
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
              // Existing Member
              const memberOperations: Promise<any>[] = [];

              if (existingMember.status !== MemberStatus.ACTIVE) {
                memberOperations.push(
                  tx.member.update({
                    where: { id: existingMember.id },
                    data: { status: MemberStatus.ACTIVE },
                  }),
                );
              }

              if (existingMember.memberType !== memberTypeInput) {
                const newMemberId = swapMemberIdPrefix(
                  existingMember.memberId,
                  memberTypeInput,
                );

                memberOperations.push(
                  tx.memberTypeHistory.updateMany({
                    where: { memberId: existingMember.id, endDate: null },
                    data: { endDate: new Date() },
                  }),
                  tx.member.update({
                    where: { id: existingMember.id },
                    data: {
                      memberType: memberTypeInput,
                      memberId: newMemberId,
                    },
                  }),
                  tx.memberTypeHistory.create({
                    data: {
                      memberId: existingMember.id,
                      memberType: memberTypeInput,
                      startDate: new Date(),
                      endDate: null,
                      changedBy: session.user.id,
                    },
                  }),
                );

                // If moving away from INTERN, mark intern as COMPLETED
                if (
                  existingMember.memberType === MemberType.INTERN &&
                  memberTypeInput !== MemberType.INTERN &&
                  existingMember.memberId
                ) {
                  memberOperations.push(
                    tx.intern.updateMany({
                      where: { memberId: existingMember.memberId },
                      data: { status: InternStatus.COMPLETED },
                    }),
                  );
                }
              }

              if (memberOperations.length > 0) {
                await Promise.all(memberOperations);
              }
            }
          }

          // STEP 6B: Handle Intern table when memberType is INTERN
          if (memberTypeInput === MemberType.INTERN && isMemberNow) {
            // 1. Try to find Intern by userId (canonical)
            let existingIntern = await tx.intern.findUnique({
              where: { userId },
            });

            // 2. Fallback: try by email (legacy interns without userId)
            if (!existingIntern && updatedUser.email) {
              existingIntern = await tx.intern.findFirst({
                where: { email: updatedUser.email },
              });

              if (existingIntern && !existingIntern.userId) {
                await tx.intern.update({
                  where: { id: existingIntern.id },
                  data: { userId },
                });
              }
            }

            // 3. If no intern at all, create one and link to user
            if (!existingIntern) {
              await tx.intern.create({
                data: {
                  name: updatedUser.name ?? "",
                  email: updatedUser.email,
                  mobile: updatedUser.phone ?? null,
                  address: updatedUser.address ?? null,
                  gender: updatedUser.gender ?? null,
                  userId,
                  joiningDate: new Date(),
                  status: InternStatus.ACTIVE,
                },
              });
            }
            // If Intern exists, do NOT change its status (per your rule)
          }
        }

        // STEP 7: Fetch final user state
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
          roles: finalUser.roleHistory?.map((h) => h.role.name) ?? [],
        };
      },
      {
        maxWait: 5000,
        timeout: 15000,
      },
    );

    return new NextResponse(JSON.stringify(result), { status: 200 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return new NextResponse("Email already exists", { status: 409 });
    }
    console.error("Update Error:", e);
    return new NextResponse(e.message || "Failed to update user", {
      status: 500,
    });
  }
}
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId?: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { userId } = await ctx.params;
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
    // cacheStrategy: { ttl: 60, swr: 60 },
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

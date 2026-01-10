import { authOptions } from "@/libs/authOptions";
import { generateNextMemberId } from "@/libs/idGenerator";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { toUTCDate } from "@/libs/toUTCDate";
import {
  MemberStatus,
  MemberType,
  OnboardingStatus,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET: List all Founder Members
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const where: any = {
      memberType: MemberType.FOUNDER,
      ...(q
        ? {
            OR: [
              { memberId: { contains: q, mode: "insensitive" } },
              { pan: { contains: q, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const members = await prisma.member.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { user: { name: "asc" } },
      cacheStrategy: { ttl: 60, swr: 60 },
    });
    const rows = members.map((m: any) => ({
      ...m,
      joiningDate: m.joiningDate?.toISOString().slice(0, 10), // "2021-06-15"
    }));
    return NextResponse.json({ rows });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

// POST: Create Founder Member (Robust Transaction)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const pan = String(body.pan || "").trim();
    const joiningDate = body.joiningDate
      ? toUTCDate(body.joiningDate)
      : new Date();

    if (!email) return new NextResponse("Email is required", { status: 400 });

    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "123123";
    const hash = await bcrypt.hash(defaultPassword, 10);

    await prisma.$transaction(
      async (tx) => {
        const memberId = await generateNextMemberId(tx, "FOUNDER");

        // 1. Ensure Member Role Exists
        let memberRole = await tx.role.findUnique({
          where: { name: RoleName.MEMBER },
        });
        if (!memberRole) {
          memberRole = await tx.role.create({
            data: {
              name: RoleName.MEMBER,
              description: "Annual / other members",
            },
          });
        }

        // 2. Find or Create User
        let user = await tx.user.findUnique({ where: { email } });
        if (!user) {
          user = await tx.user.create({
            data: {
              name: name || null,
              email,
              phone: phone || null,
              status: UserStatus.ACTIVE,
              onboardingStatus: OnboardingStatus.ACTIVE,
              activatedAt: new Date(),
              emailCredential: { create: { email, passwordHash: hash } },
            },
          });
        } else {
          // Update user details if provided (and currently missing)
          const updates: any = {};
          if (name && !user.name) updates.name = name;
          if (phone && !user.phone) updates.phone = phone;
          if (Object.keys(updates).length > 0) {
            user = await tx.user.update({
              where: { id: user.id },
              data: updates,
            });
          }
        }

        // 3. Assign Role (UserRoleHistory)
        const hasRole = await tx.userRoleHistory.findFirst({
          where: { userId: user.id, roleId: memberRole.id, endDate: null },
        });
        if (!hasRole) {
          await tx.userRoleHistory.create({
            data: {
              userId: user.id,
              roleId: memberRole.id,
              startDate: new Date(),
            },
          });
        }

        // 4. Create/Update Member Record
        let member = await tx.member.findUnique({ where: { userId: user.id } });

        if (member) {
          // If member exists but is NOT founder, we update/switch them or throw error?
          // Usually, switching types is okay, or you might want to block it.
          // Here we update to FOUNDER.
          member = await tx.member.update({
            where: { id: member.id },
            data: {
              memberType: MemberType.FOUNDER,
              joiningDate,
              pan: pan || member.pan,
            },
          });
        } else {
          member = await tx.member.create({
            data: {
              userId: user.id,
              memberId,
              memberType: MemberType.FOUNDER,
              joiningDate,
              pan: pan || null,
              status: MemberStatus.ACTIVE,
            },
          });
        }
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_FOUNDER_MEMBER_ERROR", error);
    return new NextResponse(error.message || "Internal Server Error", {
      status: 500,
    });
  }
}

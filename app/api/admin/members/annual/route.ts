import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
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

export const dynamic = "force-dynamic";

// GET: List Annual Members with search & pagination
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20))
  );
  const q = (searchParams.get("q") || "").trim();

  const where: any = {
    memberType: MemberType.ANNUAL,
    ...(q
      ? {
          OR: [
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

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        fees: true,
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  // Transform for frontend: Map fees array to a keyed object (e.g. { "2023-2024": "2023-05-10" })
  const rows = members.map((m) => {
    const feesMap: Record<string, string> = {};
    m.fees.forEach((f) => {
      if (f.paidOn) {
        feesMap[f.fiscalLabel] = f.paidOn.toISOString();
      }
    });
    return {
      ...m,
      feesMap,
    };
  });

  return NextResponse.json({ rows, total, page, pageSize });
}

// POST: Create Annual Member
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
    const joiningDateStr = body.joiningDate; // ISO string
    // fees is an object: { "2023-2024": "2023-01-01", ... }
    const feesInput = body.fees || {};

    if (!email) return new NextResponse("Email is required", { status: 400 });

    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "123123";
    const hash = await bcrypt.hash(defaultPassword, 10);

    const joiningDate = joiningDateStr ? new Date(joiningDateStr) : new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Ensure Member Role
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
        // Update user details if provided
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

      // 3. Assign Role
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
      if (!member) {
        member = await tx.member.create({
          data: {
            userId: user.id,
            memberType: MemberType.ANNUAL,
            joiningDate,
            pan: pan || null,
            status: MemberStatus.ACTIVE,
          },
        });
      } else {
        member = await tx.member.update({
          where: { id: member.id },
          data: {
            memberType: MemberType.ANNUAL,
            joiningDate,
            pan: pan || member.pan,
          },
        });
      }

      // 5. Handle Fees
      for (const [label, dateStr] of Object.entries(feesInput)) {
        if (!dateStr) continue;
        const paidOn = new Date(dateStr as string);
        if (isNaN(paidOn.getTime())) continue;

        await tx.memberFee.upsert({
          where: {
            memberId_fiscalLabel: { memberId: member.id, fiscalLabel: label },
          },
          update: { paidOn },
          create: { memberId: member.id, fiscalLabel: label, paidOn },
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_ANNUAL_MEMBER_ERROR", error);
    return new NextResponse(error.message || "Internal Server Error", {
      status: 500,
    });
  }
}

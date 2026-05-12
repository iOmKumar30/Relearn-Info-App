import { authOptions } from "@/libs/authOptions";
import { generateNextMemberId } from "@/libs/idGenerator";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import {
  Gender,
  InternStatus,
  Member,
  MemberStatus,
  MemberType,
  OnboardingStatus,
  Prisma,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
// GET /api/admin/users?page=&pageSize=&q=
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
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );
  const q = (searchParams.get("q") || "").trim();
  const gender = (searchParams.get("gender") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const role = (searchParams.get("role") || "").trim();
  const where: Prisma.UserWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  if (gender) {
    where.gender = gender as Gender;
  }
  if (status) {
    where.status = status as UserStatus;
  }

  if (role) {
    where.roleHistory = {
      some: {
        endDate: null,
        role: {
          name: role as RoleName,
        },
      },
    };
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        gender: true,
        status: true,
        onboardingStatus: true,
        createdAt: true,
        roleHistory: {
          where: { endDate: null },
          select: { role: { select: { name: true } } },
        },
        member: {
          select: {
            status: true,
            memberType: true,
            typeHistory: {
              where: { endDate: null },
              select: {
                memberType: true,
                endDate: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const mapped = rows.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    gender: u.gender,
    status: u.status,
    onboardingStatus: u.onboardingStatus,
    roles: u.roleHistory.map((h: any) => h.role.name),
    member: u.member,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ page, pageSize, total, rows: mapped });
}

// POST /api/admin/users (create user + credentials + assign roles immediately)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const rawName = body?.name ? String(body.name).trim() : null;
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const rawPhone = body?.phone ? String(body.phone).trim() : null;
  const rawAddress = body?.address ? String(body.address).trim() : null;
  const rawGender = body?.gender || null;

  const rolesInput = Array.isArray(body?.roles)
    ? (body.roles as RoleName[])
    : [];

  if (!email) return new NextResponse("Email is required", { status: 400 });
  if (rolesInput.length === 0)
    return new NextResponse("At least one role is required", { status: 400 });

  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "123123";
  const hash = await bcrypt.hash(defaultPassword, 10);

  const dbRoles = await prisma.role.findMany({
    where: { name: { in: rolesInput } },
    select: { id: true, name: true },
  });
  if (dbRoles.length !== rolesInput.length) {
    return new NextResponse("One or more roles are invalid", { status: 400 });
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        // Check if there is an existing Intern for this email
        const existingIntern = await tx.intern.findFirst({
          where: { email },
        });

        // Decide the data to use for the user:
        //    - If intern exists, override name/phone/address/gender
        //    - If no intern, use what came from the UI
        const userName = existingIntern?.name ?? rawName;
        const userPhone = existingIntern?.mobile ?? rawPhone;
        const userAddress = existingIntern?.address ?? rawAddress;
        const userGender = existingIntern?.gender ?? rawGender;

        // Create User using resolved values
        const user = await tx.user.create({
          data: {
            name: userName,
            email,
            phone: userPhone,
            address: userAddress,
            gender: userGender,
            status: UserStatus.ACTIVE,
            onboardingStatus: OnboardingStatus.ACTIVE,
            activatedAt: new Date(),
            emailCredential: { create: { email, passwordHash: hash } },
          },
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

        // Attach roles
        if (dbRoles.length > 0) {
          await tx.userRoleHistory.createMany({
            data: dbRoles.map((r) => ({
              userId: user.id,
              roleId: r.id,
              startDate: new Date(),
            })),
            skipDuplicates: true,
          });
        }

        // If INTERN member is intended, link Intern.userId
        const isMemberRole = rolesInput.includes("MEMBER");
        const memberTypeInput = body.memberType as MemberType | undefined;
        let memberRecord: Member | null = null;
        if (isMemberRole && memberTypeInput) {
          const existingMember = await tx.member.findUnique({
            where: { userId: user.id },
          });

          if (!existingMember) {
            const memberId = await generateNextMemberId(tx, memberTypeInput);
            memberRecord = await tx.member.create({
              data: {
                userId: user.id,
                memberId,
                memberType: memberTypeInput,
                joiningDate: new Date(),
                status: MemberStatus.ACTIVE,
                pan: null,
              },
            });
            await tx.memberTypeHistory.create({
              data: {
                memberId: memberRecord.id,
                memberType: memberTypeInput,
                startDate: new Date(),
                endDate: null,
                changedBy: session.user.id,
              },
            });
          } else {
            memberRecord = existingMember;
          }
        }
        if (isMemberRole && memberTypeInput === "INTERN") {
          let internToUse = existingIntern;

          if (internToUse) {
            // If intern exists and has no user, attach it
            if (!internToUse.userId) {
              await tx.intern.update({
                where: { id: internToUse.id },
                data: { userId: user.id },
              });
            }
          } else {
            const internMemberId =
              memberRecord?.memberId ??
              (await generateNextMemberId(tx, "INTERN"));
            // No intern exists (edge case) -> create new intern linked to user
            internToUse = await tx.intern.create({
              data: {
                name: userName ?? "",
                email,
                mobile: userPhone,
                memberId: internMemberId,
                address: userAddress,
                gender: userGender,
                userId: user.id,
                joiningDate: new Date(),
                status: InternStatus.ACTIVE,
              },
            });
          }
        }

        const roles = await tx.userRoleHistory.findMany({
          where: { userId: user.id, endDate: null },
          select: { role: { select: { name: true } } },
        });

        return { ...user, roles: roles.map((h) => h.role.name) };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002")
      return new NextResponse("Email already exists", { status: 409 });
    console.error("ADMIN_CREATE_USER_ERROR", e);
    return new NextResponse("Failed to create user", { status: 500 });
  }
}

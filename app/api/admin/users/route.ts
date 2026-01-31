import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { OnboardingStatus, Prisma, RoleName, UserStatus } from "@prisma/client";
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

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

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
  const name = body?.name ? String(body.name).trim() : null;
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const phone = body?.phone ? String(body.phone).trim() : null;
  const address = body?.address ? String(body.address).trim() : null;
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
    // // cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (dbRoles.length !== rolesInput.length) {
    return new NextResponse("One or more roles are invalid", { status: 400 });
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            phone,
            address,
            gender: body?.gender || null,
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

        // Batch the role inserts to keep transaction short
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

        const roles = await tx.userRoleHistory.findMany({
          where: { userId: user.id, endDate: null },
          select: { role: { select: { name: true } } },
        });

        return { ...user, roles: roles.map((h) => h.role.name) };
      },
      {
        // optional headroom; keep small to catch slow paths early
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

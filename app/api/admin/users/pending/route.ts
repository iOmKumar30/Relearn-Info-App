import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { OnboardingStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  const isAdmin =
    me?.roleHistory?.some((r) => r.role.name === "ADMIN") ?? false;
  if (!isAdmin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 10))
  );

 
  const baseOr: Prisma.UserWhereInput[] = [
    {
      onboardingStatus: {
        in: [OnboardingStatus.SUBMITTED_PROFILE, OnboardingStatus.PENDING_ROLE],
      },
    },
    {
      roleHistory: {
        some: {
          endDate: null,
          role: { name: "PENDING" }, // defensively include users with active PENDING role
        },
      },
    },
  ];

  const searchOr: Prisma.UserWhereInput[] | undefined = q
    ? [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ]
    : undefined;

  const where: Prisma.UserWhereInput = {
    OR: baseOr,
    ...(searchOr ? { OR: searchOr } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { roleRequestedAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      // we include roleHistory in select so it exists on the returned type
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        onboardingStatus: true,
        roleRequestedAt: true,
        profileSubmittedAt: true,
        createdAt: true,
        roleHistory: {
          where: { endDate: null }, // current roles only
          select: { role: { select: { name: true } } },
        },
      },
    }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    address: u.address,
    onboardingStatus: u.onboardingStatus,
    requestedAt: u.roleRequestedAt ?? u.profileSubmittedAt ?? u.createdAt,
    currentRoles: u.roleHistory.map((h) => h.role.name),
  }));

  return NextResponse.json({ page, pageSize, total, rows });
}

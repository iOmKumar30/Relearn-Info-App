import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { Prisma, RoleName } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function isAdmin(userId?: string) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  const names = u?.roleHistory?.map((h) => h.role.name) ?? [];
  return names.includes("ADMIN");
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  const admin = await isAdmin(session.user.id);
  if (!admin) return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const roleParam = (searchParams.get("role") || "").trim() as RoleName; // single role only
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20))
  );
  const q = (searchParams.get("q") || "").trim();
  if (!roleParam) {
    return new NextResponse("role query param is required, e.g. role=TUTOR", {
      status: 400,
    });
  }

  const where: Prisma.UserWhereInput = {
    roleHistory: {
      some: {
        endDate: null,
        role: { name: roleParam },
      },
    },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        onboardingStatus: true,
        createdAt: true,
        roleHistory: {
          where: { endDate: null },
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
    createdAt: u.createdAt,
    currentRoles: u.roleHistory.map((h) => h.role.name),
  }));

  return NextResponse.json({ page, pageSize, total, rows });
}

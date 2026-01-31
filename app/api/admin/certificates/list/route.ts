import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );
  const qRaw = (searchParams.get("q") || "").trim();

  // Build where in a type-safe way
  const where: Parameters<
    typeof prisma.membershipCertificate.count
  >[0]["where"] = {};

  if (qRaw) {
    where.OR = [
      { name: { contains: qRaw, mode: "insensitive" } },
      { certificateNo: { contains: qRaw, mode: "insensitive" } },
      { year: { contains: qRaw, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.membershipCertificate.count({ where }),
    prisma.membershipCertificate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        year: true,
        dateIssued: true,
        certificateNo: true,
        createdAt: true,
      },
      // cacheStrategy: { ttl: 60, swr: 60 },
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, rows });
}

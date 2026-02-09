import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return new NextResponse("Unauthorized", { status: 401 });
    if (!(await isAdmin(session.user.id)))
      return new NextResponse("Forbidden", { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 20));
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();

    const where: Prisma.MemberWhereInput = {};

    if (status) {
      where.status = status as "ACTIVE" | "INACTIVE";
    }

    if (q) {
      where.OR = [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { memberId: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const mapped = rows.map((m:any) => ({
      id: m.id,
      memberId: m.memberId,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      status: m.status,
      memberType: m.memberType,
      joiningDate: m.joiningDate,
    }));

    return NextResponse.json({
      rows: mapped,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[MEMBERS_GET]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

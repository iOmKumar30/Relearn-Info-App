import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Number(searchParams.get("pageSize") || 20));
  const q = (searchParams.get("q") || "").trim();

  // Filter for Active, Governing Body Members
  const where: any = {
    isGoverningBody: true,
    status: "ACTIVE", // Usually only active members are in GB
  };

  if (q) {
    where.user = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const [total, rows] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: { user: true }, 
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const mapped = rows.map((m:any) => ({
    id: m.id,
    memberId: m.memberId,
    name: m.user.name,
    email: m.user.email,
    phone: m.user.phone,
    memberType: m.memberType,
    joiningDate: m.joiningDate,
  }));

  return NextResponse.json({ rows: mapped, total, page, pageSize });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { memberId, action } = body; // action: 'add' or 'remove'

    if (!memberId)
      return new NextResponse("Member ID required", { status: 400 });

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: {
        isGoverningBody: action === "add",
      },
      include: { user: true },
    });

    return NextResponse.json({
      success: true,
      message: `${updated.user.name || "Member"} ${action === "add" ? "added to" : "removed from"} Governing Body`,
    });
  } catch (error: any) {
    return new NextResponse(error.message || "Error updating GB status", {
      status: 500,
    });
  }
}

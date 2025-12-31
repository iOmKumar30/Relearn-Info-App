import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // Optional: Check admin status
  // if (!(await isAdmin(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const skip = (page - 1) * pageSize;

    // --- SEARCH FILTER ---
    const where: any = {};
    if (q.trim()) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { contact: { contains: q, mode: "insensitive" } },
        { transactionId: { contains: q, mode: "insensitive" } },
      ];
    }

    // --- QUERY DB ---
    const [rows, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { date: "desc" }, // Most recent first
        skip,
        take: pageSize,
      }),
      prisma.donation.count({ where }),
    ]);

    return NextResponse.json({ rows, total });
  } catch (error) {
    console.error("DONATION_LIST_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

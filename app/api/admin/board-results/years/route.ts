import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const rows = await prisma.boardExamYear.findMany({
    orderBy: { year: "desc" },
    select: {
      year: true,
      createdAt: true,
      _count: { select: { results: true } },
    },
  });

  return NextResponse.json({
    rows: rows.map((r) => ({
      year: r.year,
      createdAt: r.createdAt,
      resultsCount: r._count.results,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const year = Number(body?.year);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return new NextResponse("Invalid year", { status: 400 });
  }

  try {
    const created = await prisma.boardExamYear.create({
      data: { year },
      select: { year: true, createdAt: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return new NextResponse("Year already exists", { status: 409 });
    }
    console.error("BOARD_RESULT_YEAR_CREATE_ERROR", e);
    return new NextResponse("Failed to create year", { status: 500 });
  }
}
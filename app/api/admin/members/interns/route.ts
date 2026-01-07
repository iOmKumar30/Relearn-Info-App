import { authOptions } from "@/libs/authOptions";
import { generateNextMemberId } from "@/libs/idGenerator";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { InternStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
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
      Math.max(1, Number(searchParams.get("pageSize") || 20))
    );
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status");

    const skip = (page - 1) * pageSize;

    const where: any = {
      ...(q
        ? {
          OR: [
              { memberId: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { institution: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    if (status && status !== "ALL") {
      where.status = status as InternStatus;
    }

    const [total, rows] = await Promise.all([
      prisma.intern.count({ where }),
      prisma.intern.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        cacheStrategy: { ttl: 60, swr: 60 },
      }),
    ]);

    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("INTERNS_GET_ERROR", error);
    return new NextResponse(
      JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST: Create Intern
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();

    if (!body.name || !body.email) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate ID
      const memberId = await generateNextMemberId(tx, "INTERN");

      const intern = await tx.intern.create({
        data: {
          ...body,
          memberId, 
        },
      });
      return intern;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_INTERN_ERROR", error);
    return new NextResponse(
      JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

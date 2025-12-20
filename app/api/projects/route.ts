import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { ProjectStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20))
  );
  const q = (searchParams.get("q") || "").trim();

  const where: any = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { sponsoredBy: { contains: q, mode: "insensitive" } },
          { year: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ rows, total, page, pageSize });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();

    // create project 
    const project = await prisma.project.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status || ProjectStatus.ONGOING,
        conclusion: body.conclusion,
        nextSteps: body.nextSteps,
        mentors: body.mentors,
        sponsoredBy: body.sponsoredBy,
        year: body.year,
        funds: body.funds ? Number(body.funds) : null,
        place: body.place,
        targetGroup: body.targetGroup,
        beneficiaries: body.beneficiaries,
        reportUrl: body.reportUrl, // The URL from UploadThing
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}

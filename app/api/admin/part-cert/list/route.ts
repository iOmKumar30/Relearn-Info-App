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
    Math.max(1, Number(searchParams.get("pageSize") || 20))
  );
  const qRaw = (searchParams.get("q") || "").trim();

  // Build where clause for ParticipationCertificate
  const where: Parameters<
    typeof prisma.participationCertificate.count
  >[0]["where"] = {};

  if (qRaw) {
    where.OR = [
      { name: { contains: qRaw, mode: "insensitive" } },
      { certificateNo: { contains: qRaw, mode: "insensitive" } },
      { institute: { contains: qRaw, mode: "insensitive" } },
      { aadhaar: { contains: qRaw, mode: "insensitive" } },
    ];
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.participationCertificate.count({ where }),
      prisma.participationCertificate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // Select all fields needed for the Preview Card
        select: {
          id: true,
          certificateNo: true,
          name: true,
          aadhaar: true,
          classYear: true,
          institute: true,
          duration: true,
          startDate: true,
          endDate: true,
          issueDate: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ page, pageSize, total, rows });
  } catch (error) {
    console.error("PART_CERT_LIST_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

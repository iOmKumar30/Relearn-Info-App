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

  // Pagination Params
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );

  // Search Query
  const qRaw = (searchParams.get("q") || "").trim();

  // Build where clause
  const where: any = {};

  if (qRaw) {
    where.OR = [
      { voucherNo: { contains: qRaw, mode: "insensitive" } },
      { payeeName: { contains: qRaw, mode: "insensitive" } },
      { projectName: { contains: qRaw, mode: "insensitive" } },
      { expenditureHead: { contains: qRaw, mode: "insensitive" } },
      // Optional: Search by payeeMobile
      { payeeMobile: { contains: qRaw, mode: "insensitive" } },
    ];
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.paymentVoucher.count({ where }),
      prisma.paymentVoucher.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          voucherNo: true,
          paymentDate: true,
          payeeName: true,
          payeeMobile: true,
          projectName: true,
          expenditureHead: true,
          totalAmount: true,
          amountInWords: true,
          paymentMode: true,
          paymentRef: true,
          createdAt: true,
          items: true,
        },
        // cacheStrategy: { ttl: 60, swr: 60 },
      }),
    ]);

    return NextResponse.json({ page, pageSize, total, rows });
  } catch (error) {
    console.error("PAYMENT_VOUCHER_LIST_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

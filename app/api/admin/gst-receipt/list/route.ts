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
      { invoiceNo: { contains: qRaw, mode: "insensitive" } },
      { billToName: { contains: qRaw, mode: "insensitive" } },
      { billToGstin: { contains: qRaw, mode: "insensitive" } },
      { placeOfSupply: { contains: qRaw, mode: "insensitive" } },
      // Search by total amount (string conversion might be needed if strictly searching for numbers,
      // but usually search bars are text-based. Prisma doesn't support implicit number->string 'contains'.)
    ];
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.gstReceipt.count({ where }),
      prisma.gstReceipt.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // we can adjust fields here as needed
        select: {
          id: true,
          invoiceNo: true,
          invoiceDate: true,
          billToName: true,
          billToGstin: true,
          placeOfSupply: true,
          totalAmount: true,
          totalTax: true,
          grandTotal: true,
          createdAt: true,
          // We might not need 'items' in the list view to save bandwidth
          // Fetch full details only on 'Edit' or 'Preview' via separate call or just include if list is small
          items: true,
          reverseCharge: true,
          dateOfSupply: true,
          billToState: true,
          billToCode: true,
          shipToName: true,
          shipToGstin: true,
          shipToState: true,
          shipToCode: true,
          amountInWords: true,
        },
        // cacheStrategy: { ttl: 60, swr: 60 },
      }),
    ]);

    return NextResponse.json({ page, pageSize, total, rows });
  } catch (error) {
    console.error("GST_RECEIPT_LIST_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

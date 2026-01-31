import { authOptions } from "@/libs/authOptions";
import getFinancialYear from "@/libs/getFinancialYear";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ToWords } from "to-words";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
  },
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();

  let voucherNo = String(body?.voucherNo ?? "").trim();

  if (!voucherNo) {
    const fy = getFinancialYear(); // "25-26"
    const prefix = `RELF/PV/${fy}/`;

    const counterKey = `PV-${fy}`;

    const counter = await prisma.invoiceCounter.upsert({
      where: { financialYear: counterKey },
      update: { currentSeq: { increment: 1 } },
      create: { financialYear: counterKey, currentSeq: 1 },
    });

    const nextSequence = counter.currentSeq;
    const sequenceStr = nextSequence.toString().padStart(3, "0");
    voucherNo = `${prefix}${sequenceStr}`;
  }

  const paymentDateStr = body?.paymentDate;
  const paymentDate = paymentDateStr ? new Date(paymentDateStr) : new Date();

  const projectName = String(body?.projectName ?? "").trim();
  const expenditureHead = String(body?.expenditureHead ?? "").trim();

  const payeeName = String(body?.payeeName ?? "").trim();
  const payeeMobile = String(body?.payeeMobile ?? "").trim();

  const paymentMode = String(body?.paymentMode ?? "").trim();

  const items = Array.isArray(body?.items) ? body.items : [];

  if (!voucherNo || !payeeName || items.length === 0) {
    return new NextResponse(
      "Voucher No (or auto-gen failure), Payee Name, and at least one item are required.",
      { status: 400 },
    );
  }

  const totalAmount = items.reduce(
    (sum: number, item: any) => sum + (Number(item.amount) || 0),
    0,
  );

  const amountInWords = toWords.convert(totalAmount, { currency: true });

  try {
    const created = await prisma.paymentVoucher.create({
      data: {
        voucherNo,
        paymentDate,

        projectName: projectName || null,
        expenditureHead: expenditureHead || null,

        payeeName,
        payeeMobile: payeeMobile || null,

        // JSON Data
        items,

        totalAmount,
        amountInWords,

        paymentMode: paymentMode || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("PAYMENT_VOUCHER_CREATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const rows = await prisma.paymentVoucher.findMany({
      where: {
        OR: [
          { voucherNo: { contains: q, mode: "insensitive" } },
          { payeeName: { contains: q, mode: "insensitive" } },
          { projectName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      // Remove // cacheStrategy if your Prisma client doesn't support it (e.g. Accelerate),
      // otherwise keep it.
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("PAYMENT_VOUCHER_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

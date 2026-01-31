import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ToWords } from "to-words";

const toWords = new ToWords();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const row = await prisma.paymentVoucher.findUnique({
      where: { id },
      // cacheStrategy: { ttl: 60, swr: 60 },
    });

    if (!row) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("PAYMENT_VOUCHER_GET_ID_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const body = await req.json();

    const voucherNo = String(body?.voucherNo ?? "").trim();

    const paymentDateStr = body?.paymentDate;
    const paymentDate = paymentDateStr ? new Date(paymentDateStr) : new Date();

    const projectName = String(body?.projectName ?? "").trim();
    const expenditureHead = String(body?.expenditureHead ?? "").trim();

    const payeeName = String(body?.payeeName ?? "").trim();
    const payeeMobile = String(body?.payeeMobile ?? "").trim();

    const paymentMode = String(body?.paymentMode ?? "").trim();
    const paymentRef = String(body?.paymentRef ?? "").trim();

    const items = Array.isArray(body?.items) ? body.items : [];

    if (!voucherNo || !payeeName || items.length === 0) {
      return new NextResponse(
        "Voucher No, Payee Name, and at least one item are required.",
        { status: 400 },
      );
    }

    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + (Number(item.amount) || 0),
      0,
    );

    const amountInWords = toWords.convert(totalAmount, { currency: true });

    const updated = await prisma.paymentVoucher.update({
      where: { id },
      data: {
        voucherNo,
        paymentDate,

        projectName: projectName || null,
        expenditureHead: expenditureHead || null,

        payeeName,
        payeeMobile: payeeMobile || null,

        items,

        totalAmount,
        amountInWords,

        paymentMode: paymentMode || null,
        paymentRef: paymentRef || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PAYMENT_VOUCHER_UPDATE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    await prisma.paymentVoucher.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PAYMENT_VOUCHER_DELETE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

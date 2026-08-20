import { verifyInternPaymentReceiptToken } from "@/libs/intern-payment";
import prisma from "@/libs/prismadb";
import { InternPaymentOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const paymentOrderId = verifyInternPaymentReceiptToken(token);
    if (!paymentOrderId) {
      return NextResponse.json(
        { error: "This receipt link has expired." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const paymentOrder = await prisma.internPaymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        intern: { select: { name: true, email: true, mobile: true, feePaidDate: true } },
      },
    });
    if (!paymentOrder || paymentOrder.status !== InternPaymentOrderStatus.CAPTURED) {
      return NextResponse.json(
        { error: "Payment receipt is not available." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        receiptNumber: paymentOrder.receiptNumber,
        paymentId: paymentOrder.razorpayPaymentId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        paidAt: paymentOrder.paidAt || paymentOrder.intern.feePaidDate,
        intern: paymentOrder.intern,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("INTERN_PAYMENT_RECEIPT_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Unable to load the payment receipt." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

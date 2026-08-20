import {
  createInternPaymentReceiptNumber,
  createRazorpayInternPaymentOrder,
  razorpayPublicKeyId,
  verifyInternPaymentActivationToken,
} from "@/libs/intern-payment";
import prisma from "@/libs/prismadb";
import { InternPaymentOrderStatus, PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.paymentToken === "string" ? body.paymentToken : "";
    const internId = token ? verifyInternPaymentActivationToken(token) : null;
    if (!internId) return response("This payment session has expired. Please contact Relearn Foundation.", 403);

    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        feeAmount: true,
        paymentStatus: true,
      },
    });
    if (!intern) return response("This payment session is no longer available.", 404);

    if (intern.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json(
        { status: "PAID" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const amount = intern.feeAmount;
    if (!Number.isSafeInteger(amount) || !amount || amount <= 0) {
      console.error("INTERN_PAYMENT_ORDER_INVALID_AMOUNT", { internId, amount });
      return response("Online payment is not available for this registration.", 409);
    }

    const existing = await prisma.internPaymentOrder.findFirst({
      where: {
        internId,
        status: { in: [InternPaymentOrderStatus.CREATED, InternPaymentOrderStatus.AUTHORIZED] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing?.status === InternPaymentOrderStatus.AUTHORIZED) {
      return NextResponse.json(
        { status: "PROCESSING" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          status: "READY",
          orderId: existing.razorpayOrderId,
          amount: existing.amount * 100,
          currency: existing.currency,
          keyId: razorpayPublicKeyId(),
          prefill: { name: intern.name, email: intern.email, contact: intern.mobile },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const receiptNumber = createInternPaymentReceiptNumber(internId);
    const razorpayOrder = await createRazorpayInternPaymentOrder({
      amountRupees: amount,
      receiptNumber,
    });
    if (razorpayOrder.amount !== amount * 100 || razorpayOrder.currency !== "INR") {
      throw new Error("Razorpay created an order with an unexpected amount or currency");
    }

    await prisma.internPaymentOrder.create({
      data: {
        internId,
        razorpayOrderId: razorpayOrder.id,
        receiptNumber,
        amount,
        currency: "INR",
      },
    });

    return NextResponse.json(
      {
        status: "READY",
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: razorpayPublicKeyId(),
        prefill: { name: intern.name, email: intern.email, contact: intern.mobile },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("INTERN_PAYMENT_ORDER_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return response("Unable to start the payment. Please try again later.", 500);
  }
}

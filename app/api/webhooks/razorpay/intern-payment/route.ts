import {
  markInternPaymentCaptured,
  verifyRazorpayWebhookSignature,
} from "@/libs/intern-payment";
import prisma from "@/libs/prismadb";
import { InternPaymentOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayWebhookPayment = {
  id?: unknown;
  order_id?: unknown;
  amount?: unknown;
  currency?: unknown;
  created_at?: unknown;
};

function paymentFromWebhook(payload: any): RazorpayWebhookPayment {
  return payload?.payload?.payment?.entity || {};
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
      console.warn("RAZORPAY_INTERN_WEBHOOK_SIGNATURE_REJECTED");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = request.headers.get("x-razorpay-event-id") || "unknown";
    const payload = JSON.parse(rawBody);
    const payment = paymentFromWebhook(payload);
    const orderId = typeof payment.order_id === "string" ? payment.order_id : "";
    const paymentId = typeof payment.id === "string" ? payment.id : "";

    if (payload.event === "payment.captured") {
      const amount = typeof payment.amount === "number" ? payment.amount : NaN;
      const currency = typeof payment.currency === "string" ? payment.currency : "";
      if (!orderId || !paymentId || !Number.isSafeInteger(amount) || !currency) {
        console.warn("RAZORPAY_INTERN_WEBHOOK_INVALID_CAPTURE", { event });
        return NextResponse.json({ received: true });
      }

      const paidAt =
        typeof payment.created_at === "number"
          ? new Date(payment.created_at * 1000)
          : new Date();
      const result = await markInternPaymentCaptured({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        amountPaise: amount,
        currency,
        paidAt,
      });
      if (result.outcome === "not_found") {
        console.warn("RAZORPAY_INTERN_WEBHOOK_ORDER_NOT_FOUND", { event, orderId });
      }
    } else if (payload.event === "payment.failed" && orderId) {
      await prisma.internPaymentOrder.updateMany({
        where: {
          razorpayOrderId: orderId,
          status: { not: InternPaymentOrderStatus.CAPTURED },
        },
        data: { status: InternPaymentOrderStatus.FAILED, failedAt: new Date() },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("RAZORPAY_INTERN_WEBHOOK_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Returning a non-2xx response lets Razorpay retry a transient failure.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

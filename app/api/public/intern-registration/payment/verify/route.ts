import {
  createInternPaymentReceiptToken,
  fetchRazorpayPayment,
  markInternPaymentAuthorized,
  markInternPaymentCaptured,
  verifyInternPaymentActivationToken,
  verifyRazorpayPaymentSignature,
} from "@/libs/intern-payment";
import {
  boundedString,
  PublicJsonRequestError,
  readPublicJsonObject,
} from "@/libs/public-json";
import prisma from "@/libs/prismadb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_PAYMENT_REQUEST_BYTES = 4_096;
const RAZORPAY_ORDER_ID_PATTERN = /^order_[A-Za-z0-9]+$/;
const RAZORPAY_PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]+$/;
const RAZORPAY_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const body = await readPublicJsonObject(request, MAX_PAYMENT_REQUEST_BYTES);
    const paymentToken = boundedString(body.paymentToken, 2_048);
    const internId = paymentToken
      ? verifyInternPaymentActivationToken(paymentToken)
      : null;
    const paymentId = boundedString(body.razorpay_payment_id, 128);
    const requestedOrderId = boundedString(body.razorpay_order_id, 128);
    const signature = boundedString(body.razorpay_signature, 64);
    if (
      !internId ||
      !paymentId ||
      !requestedOrderId ||
      !signature ||
      !RAZORPAY_ORDER_ID_PATTERN.test(requestedOrderId) ||
      !RAZORPAY_PAYMENT_ID_PATTERN.test(paymentId) ||
      !RAZORPAY_SIGNATURE_PATTERN.test(signature)
    ) {
      return response("Unable to verify this payment.", 400);
    }

    const paymentOrder = await prisma.internPaymentOrder.findFirst({
      where: { internId, razorpayOrderId: requestedOrderId },
    });
    if (!paymentOrder) return response("Unable to verify this payment.", 404);

    if (
      !verifyRazorpayPaymentSignature({
        orderId: paymentOrder.razorpayOrderId,
        paymentId,
        signature,
      })
    ) {
      console.warn("INTERN_PAYMENT_SIGNATURE_REJECTED", {
        internId,
        orderId: paymentOrder.razorpayOrderId,
      });
      return response("Unable to verify this payment.", 400);
    }

    const payment = await fetchRazorpayPayment(paymentId);
    if (
      payment.order_id !== paymentOrder.razorpayOrderId ||
      payment.amount !== paymentOrder.amount * 100 ||
      payment.currency !== paymentOrder.currency
    ) {
      console.warn("INTERN_PAYMENT_PROVIDER_MISMATCH", {
        internId,
        orderId: paymentOrder.razorpayOrderId,
      });
      return response("Unable to verify this payment.", 400);
    }

    if (payment.status === "captured") {
      const result = await markInternPaymentCaptured({
        razorpayOrderId: paymentOrder.razorpayOrderId,
        razorpayPaymentId: payment.id,
        amountPaise: payment.amount,
        currency: payment.currency,
        paidAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
      });
      if (result.outcome !== "captured") return response("Unable to confirm this payment.", 404);

      return NextResponse.json(
        {
          status: "PAID",
          receiptToken: createInternPaymentReceiptToken(result.paymentOrderId),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (payment.status === "authorized") {
      await markInternPaymentAuthorized({
        razorpayOrderId: paymentOrder.razorpayOrderId,
        razorpayPaymentId: payment.id,
      });
    }

    return NextResponse.json(
      { status: "PROCESSING" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PublicJsonRequestError) {
      return response(error.message, error.status);
    }
    console.error("INTERN_PAYMENT_VERIFY_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return response("Unable to verify this payment. Please contact Relearn Foundation if you were charged.", 500);
  }
}

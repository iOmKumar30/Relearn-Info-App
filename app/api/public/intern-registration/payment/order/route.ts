import {
  createInternPaymentReceiptNumber,
  createRazorpayInternPaymentOrder,
  razorpayPublicKeyId,
  verifyInternPaymentActivationToken,
} from "@/libs/intern-payment";
import {
  boundedString,
  PublicJsonRequestError,
  readPublicJsonObject,
} from "@/libs/public-json";
import prisma from "@/libs/prismadb";
import {
  InternPaymentOrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_PAYMENT_REQUEST_BYTES = 4_096;

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const body = await readPublicJsonObject(request, MAX_PAYMENT_REQUEST_BYTES);
    const token = boundedString(body.paymentToken, 2_048);
    const internId = token ? verifyInternPaymentActivationToken(token) : null;
    if (!internId) return response("This payment session has expired. Please contact Relearn Foundation.", 403);

    // Lock this Intern row for the duration of order provisioning. That makes
    // parallel clicks/retries for the same token observe and reuse one order.
    // Razorpay is called only by the transaction that owns the row lock.
    const result = await prisma.$transaction(
      async (tx) => {
        const intern = await tx.intern.update({
          where: { id: internId },
          data: { updatedAt: new Date() },
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            feeAmount: true,
            paymentStatus: true,
          },
        });

        if (intern.paymentStatus === PaymentStatus.PAID) {
          return { status: "PAID" as const };
        }

        const amount = intern.feeAmount;
        if (!Number.isSafeInteger(amount) || !amount || amount <= 0) {
          console.error("INTERN_PAYMENT_ORDER_INVALID_AMOUNT", { internId, amount });
          return { status: "UNAVAILABLE" as const };
        }

        const existing = await tx.internPaymentOrder.findFirst({
          where: {
            internId,
            status: { in: [InternPaymentOrderStatus.CREATED, InternPaymentOrderStatus.AUTHORIZED] },
          },
          orderBy: { createdAt: "desc" },
        });

        if (existing?.status === InternPaymentOrderStatus.AUTHORIZED) {
          return { status: "PROCESSING" as const };
        }

        if (existing) {
          return {
            status: "READY" as const,
            orderId: existing.razorpayOrderId,
            amount: existing.amount * 100,
            currency: existing.currency,
            prefill: { name: intern.name, email: intern.email, contact: intern.mobile },
          };
        }

        const receiptNumber = createInternPaymentReceiptNumber(internId);
        const razorpayOrder = await createRazorpayInternPaymentOrder({
          amountRupees: amount,
          receiptNumber,
        });
        if (razorpayOrder.amount !== amount * 100 || razorpayOrder.currency !== "INR") {
          throw new Error("Razorpay created an order with an unexpected amount or currency");
        }

        await tx.internPaymentOrder.create({
          data: {
            internId,
            razorpayOrderId: razorpayOrder.id,
            receiptNumber,
            amount,
            currency: "INR",
          },
        });

        return {
          status: "READY" as const,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          prefill: { name: intern.name, email: intern.email, contact: intern.mobile },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 15_000,
      },
    );

    if (result.status === "PAID") {
      return NextResponse.json(
        { status: "PAID" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (result.status === "UNAVAILABLE") {
      return response("Online payment is not available for this registration.", 409);
    }
    if (result.status === "PROCESSING") {
      return NextResponse.json(
        { status: "PROCESSING" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        status: "READY",
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        keyId: razorpayPublicKeyId(),
        prefill: result.prefill,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PublicJsonRequestError) {
      return response(error.message, error.status);
    }
    console.error("INTERN_PAYMENT_ORDER_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return response("Unable to start the payment. Please try again later.", 500);
  }
}

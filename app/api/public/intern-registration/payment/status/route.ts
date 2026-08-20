import {
  createInternPaymentReceiptToken,
  verifyInternPaymentActivationToken,
} from "@/libs/intern-payment";
import prisma from "@/libs/prismadb";
import { InternPaymentOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body?.paymentToken === "string" ? body.paymentToken : "";
    const internId = token ? verifyInternPaymentActivationToken(token) : null;
    if (!internId) {
      return NextResponse.json(
        { error: "This payment session has expired. Please contact Relearn Foundation." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const [intern, paymentOrder] = await Promise.all([
      prisma.intern.findUnique({
        where: { id: internId },
        select: { feeAmount: true },
      }),
      prisma.internPaymentOrder.findFirst({
        where: { internId, status: InternPaymentOrderStatus.CAPTURED },
        orderBy: { paidAt: "desc" },
        select: { id: true },
      }),
    ]);
    if (!intern) {
      return NextResponse.json(
        { error: "This payment session is no longer available." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!paymentOrder) {
      return NextResponse.json(
        { status: "PENDING", amount: intern.feeAmount },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        status: "PAID",
        receiptToken: createInternPaymentReceiptToken(paymentOrder.id),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("INTERN_PAYMENT_STATUS_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Unable to check the payment status." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

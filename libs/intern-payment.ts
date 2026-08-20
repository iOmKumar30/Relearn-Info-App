import { DEFAULT_MEMBER_FEES } from "@/libs/memberConstants";
import {
  InternPaymentOrderStatus,
  InternStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import prisma from "./prismadb";

const TOKEN_ISSUER = "relf-intern-payment";
const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RECEIPT_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type TokenPurpose = "activate" | "receipt";
type InternPaymentToken = {
  purpose: TokenPurpose;
  resourceId: string;
  expiresAt: number;
};

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: number;
  method?: string;
};

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export const INTERN_PAYMENT_AMOUNT_RUPEES = DEFAULT_MEMBER_FEES.INTERN;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required ${name} configuration`);
  return value;
}

function paymentTokenSecret(): string {
  const secret = requiredEnv("INTERN_PAYMENT_TOKEN_SECRET");
  if (secret.length < 32) {
    throw new Error("INTERN_PAYMENT_TOKEN_SECRET must be at least 32 characters");
  }
  return secret;
}

export function assertInternPaymentTokenConfiguration(): void {
  paymentTokenSecret();
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signToken(payload: InternPaymentToken): string {
  const encodedPayload = base64Url(JSON.stringify({ ...payload, issuer: TOKEN_ISSUER }));
  const signature = createHmac("sha256", paymentTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string, purpose: TokenPurpose): string | null {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;

  const expectedSignature = createHmac("sha256", paymentTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as InternPaymentToken & { issuer?: string };
    if (
      payload.issuer !== TOKEN_ISSUER ||
      payload.purpose !== purpose ||
      typeof payload.resourceId !== "string" ||
      !payload.resourceId ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload.resourceId;
  } catch {
    return null;
  }
}

export function createInternPaymentActivationToken(internId: string): string {
  return signToken({
    purpose: "activate",
    resourceId: internId,
    expiresAt: Date.now() + ACTIVATION_TOKEN_TTL_MS,
  });
}

export function verifyInternPaymentActivationToken(token: string): string | null {
  return verifyToken(token, "activate");
}

export function createInternPaymentReceiptToken(paymentOrderId: string): string {
  return signToken({
    purpose: "receipt",
    resourceId: paymentOrderId,
    expiresAt: Date.now() + RECEIPT_TOKEN_TTL_MS,
  });
}

export function verifyInternPaymentReceiptToken(token: string): string | null {
  return verifyToken(token, "receipt");
}

function razorpayAuthHeader(): string {
  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function razorpayPublicKeyId(): string {
  return requiredEnv("RAZORPAY_KEY_ID");
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Razorpay request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function createRazorpayInternPaymentOrder(input: {
  amountRupees: number;
  receiptNumber: string;
}): Promise<RazorpayOrder> {
  const amount = input.amountRupees * 100;
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Invalid internship payment amount");
  }

  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: input.receiptNumber,
      notes: { purpose: "internship_registration" },
    }),
  });
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = createHmac("sha256", requiredEnv("RAZORPAY_KEY_SECRET"))
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return safeEqual(input.signature, expected);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", requiredEnv("RAZORPAY_WEBHOOK_SECRET"))
    .update(rawBody)
    .digest("hex");
  return safeEqual(signature, expected);
}

export function createInternPaymentReceiptNumber(internId: string): string {
  return `INT-${internId.slice(-8)}-${randomBytes(4).toString("hex")}`.toUpperCase();
}

export async function markInternPaymentCaptured(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  currency: string;
  paidAt: Date;
}) {
  return prisma.$transaction(
    async (tx) => {
      const paymentOrder = await tx.internPaymentOrder.findUnique({
        where: { razorpayOrderId: input.razorpayOrderId },
        include: { intern: { select: { status: true } } },
      });
      if (!paymentOrder) return { outcome: "not_found" as const };

      if (
        input.currency !== paymentOrder.currency ||
        input.amountPaise !== paymentOrder.amount * 100
      ) {
        throw new Error("Razorpay payment amount or currency did not match the order");
      }

      if (
        paymentOrder.razorpayPaymentId &&
        paymentOrder.razorpayPaymentId !== input.razorpayPaymentId
      ) {
        throw new Error("Razorpay order already has a different payment identifier");
      }

      if (paymentOrder.status !== InternPaymentOrderStatus.CAPTURED) {
        await tx.internPaymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            razorpayPaymentId: input.razorpayPaymentId,
            status: InternPaymentOrderStatus.CAPTURED,
            paidAt: input.paidAt,
          },
        });

        await tx.intern.update({
          where: { id: paymentOrder.internId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            feePaidDate: input.paidAt,
            ...(paymentOrder.intern.status === InternStatus.PENDING_START
              ? { status: InternStatus.ACTIVE }
              : {}),
          },
        });
      }

      return {
        outcome: "captured" as const,
        paymentOrderId: paymentOrder.id,
        receiptNumber: paymentOrder.receiptNumber,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function markInternPaymentAuthorized(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}) {
  await prisma.internPaymentOrder.updateMany({
    where: {
      razorpayOrderId: input.razorpayOrderId,
      status: { not: InternPaymentOrderStatus.CAPTURED },
    },
    data: {
      razorpayPaymentId: input.razorpayPaymentId,
      status: InternPaymentOrderStatus.AUTHORIZED,
    },
  });
}

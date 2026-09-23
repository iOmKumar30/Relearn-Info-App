import {
  applicationUrl,
  passwordEmailIsConfigured,
  passwordResetEmail,
  sendTransactionalEmail,
} from "@/libs/email";
import { clientIp, createPasswordResetSecret, hashPasswordResetToken, normalizeEmail, PASSWORD_RESET_TTL_MS } from "@/libs/password-reset";
import prisma from "@/libs/prismadb";
import { forgotPasswordRatelimit } from "@/libs/rate-limit";
import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const GENERIC_RESPONSE = {
  message: "If an eligible account exists for that email address, a password-reset link has been sent.",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const ip = clientIp(req);

  const [ipLimit, emailLimit] = await Promise.all([
    forgotPasswordRatelimit.limit(`ip:${ip}`),
    forgotPasswordRatelimit.limit(`email:${hashPasswordResetToken(email || "invalid")}`),
  ]);
  if (!ipLimit.success || !emailLimit.success) {
    return new NextResponse("Too many password-reset requests. Try again later.", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(Math.min(ipLimit.limit, emailLimit.limit)),
        "X-RateLimit-Remaining": String(Math.min(ipLimit.remaining, emailLimit.remaining)),
        "X-RateLimit-Reset": String(Math.max(ipLimit.reset, emailLimit.reset)),
      },
    });
  }

  // Keep the response identical for unknown, inactive, and OAuth-only accounts.
  if (!email || !passwordEmailIsConfigured()) {
    if (!passwordEmailIsConfigured()) {
      console.error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
    }
    return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        emailCredential: { select: { id: true } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE || !user.emailCredential) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
    }

    const { token, tokenHash } = createPasswordResetSecret();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

    const reset = await prisma.$transaction(async (tx) => {
      // A new request supersedes every older, unused reset link.
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      return tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
        select: { id: true },
      });
    });

    // Keep the secret in the URL fragment: browsers do not send fragments to
    // the server, reverse proxies, or referrers.
    const resetUrl = `${applicationUrl()}/reset-password#token=${encodeURIComponent(token)}`;
    try {
      await sendTransactionalEmail({
        to: user.email,
        ...passwordResetEmail({ name: user.name, resetUrl }),
      });
    } catch (error) {
      // A link that was never delivered must not remain usable.
      await prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }).catch(() => undefined);
      console.error("PASSWORD_RESET_EMAIL_SEND_ERROR", { userId: user.id, error });
    }
  } catch (error) {
    // The public response remains non-enumerating while details stay server-side.
    console.error("PASSWORD_RESET_REQUEST_ERROR", { email, error });
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
}

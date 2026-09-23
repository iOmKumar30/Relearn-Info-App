import {
  passwordResetConfirmationEmail,
  sendTransactionalEmail,
} from "@/libs/email";
import { clientIp, hashPasswordResetToken } from "@/libs/password-reset";
import prisma from "@/libs/prismadb";
import { passwordResetRatelimit } from "@/libs/rate-limit";
import { recordSessionVersion } from "@/libs/session-revocation";
import { UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

const INVALID_TOKEN_MESSAGE = "This password-reset link is invalid or has expired. Request a new link and try again.";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await passwordResetRatelimit.limit(`ip:${ip}`);
  if (!limit.success) {
    return new NextResponse("Too many password-reset attempts. Try again later.", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": String(limit.remaining),
        "X-RateLimit-Reset": String(limit.reset),
      },
    });
  }

  const body = await req.json().catch(() => null);
  const token = body?.token;
  const newPassword = body?.newPassword;
  if (typeof token !== "string" || !token || typeof newPassword !== "string") {
    return new NextResponse(INVALID_TOKEN_MESSAGE, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(token);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          usedAt: true,
          user: {
            select: {
              email: true,
              name: true,
              status: true,
              emailCredential: { select: { id: true } },
            },
          },
        },
      });

      if (
        !resetToken ||
        resetToken.usedAt ||
        resetToken.expiresAt <= now ||
        resetToken.user.status !== UserStatus.ACTIVE ||
        !resetToken.user.emailCredential
      ) {
        return null;
      }

      // Claim the token conditionally. This makes concurrent submissions
      // single-use even when they arrive at the same time.
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claim.count !== 1) return null;

      await tx.emailCredential.update({
        where: { id: resetToken.user.emailCredential.id },
        data: { passwordHash, failedCount: 0, lockedUntil: null },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: now },
      });
      const user = await tx.user.update({
        where: { id: resetToken.userId },
        data: { sessionVersion: { increment: 1 } },
        select: { id: true, email: true, name: true, sessionVersion: true },
      });
      return user;
    });

    if (!result) return new NextResponse(INVALID_TOKEN_MESSAGE, { status: 400 });

    try {
      await recordSessionVersion(result.id, result.sessionVersion ?? 0);
    } catch (error) {
      // The persisted version is retained for recovery; Redis is used only to
      // enforce it in edge middleware without adding database reads.
      console.error("PASSWORD_RESET_SESSION_REVOCATION_CACHE_ERROR", { userId: result.id, error });
    }

    try {
      await sendTransactionalEmail({
        to: result.email,
        ...passwordResetConfirmationEmail({ name: result.name }),
      });
    } catch (error) {
      // The reset itself succeeded; do not make a single-use token retryable.
      console.error("PASSWORD_RESET_CONFIRMATION_EMAIL_ERROR", { userId: result.id, error });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PASSWORD_RESET_ERROR", { error });
    return new NextResponse("Unable to reset password. Please try again later.", { status: 500 });
  }
}

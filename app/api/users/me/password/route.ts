import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { passwordChangeRatelimit } from "@/libs/rate-limit";
import { recordSessionVersion } from "@/libs/session-revocation";
import { UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const limit = await passwordChangeRatelimit.limit(userId);
  if (!limit.success) {
    return new NextResponse("Too many password-change attempts. Try again later.", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": String(limit.remaining),
        "X-RateLimit-Reset": String(limit.reset),
      },
    });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return new NextResponse("Current and new passwords are required", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      emailCredential: { select: { id: true, passwordHash: true } },
    },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    return new NextResponse("Profile unavailable", { status: 403 });
  }
  if (!user.emailCredential) {
    return new NextResponse("Password changes are unavailable for this sign-in method", { status: 400 });
  }

  const currentPasswordMatches = await bcrypt.compare(
    currentPassword,
    user.emailCredential.passwordHash,
  );
  if (!currentPasswordMatches) {
    return new NextResponse("Current password is incorrect", { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.emailCredential.update({
      where: { id: user.emailCredential!.id },
      data: { passwordHash, failedCount: 0, lockedUntil: null },
    });
    return tx.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
  });
  try {
    await recordSessionVersion(userId, updatedUser.sessionVersion ?? 0);
  } catch (error) {
    console.error("PASSWORD_CHANGE_SESSION_REVOCATION_CACHE_ERROR", { userId, error });
  }

  return NextResponse.json({ success: true });
}

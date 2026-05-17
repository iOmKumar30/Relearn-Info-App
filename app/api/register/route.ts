import prisma from "@/libs/prismadb";
import { verifyTurnstile } from "@/libs/turnstile";
import { OnboardingStatus, RoleName, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const body = await req.json();
    const { email, password, cfToken } = body ?? {};

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      console.warn("REGISTER_REJECTED", {
        reason: "missing_fields",
        ip,
        userAgent,
      });
      return new NextResponse("Missing fields", { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      console.warn("REGISTER_REJECTED", {
        reason: "password_too_short",
        ip,
        userAgent,
        email: normalizedEmail,
      });
      return new NextResponse("Password too short", { status: 400 });
    }

    if (!cfToken) {
      console.warn("REGISTER_REJECTED", {
        reason: "missing_turnstile_token",
        ip,
        userAgent,
        email: normalizedEmail,
      });
      return new NextResponse("Missing verification token", { status: 400 });
    }

    const isHuman = await verifyTurnstile(cfToken, ip);

    if (!isHuman) {
      console.warn("REGISTER_REJECTED", {
        reason: "turnstile_failed",
        ip,
        userAgent,
        email: normalizedEmail,
      });
      return new NextResponse("Bot verification failed", { status: 403 });
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingByEmail) {
      console.warn("REGISTER_REJECTED", {
        reason: "user_already_exists",
        ip,
        userAgent,
        email: normalizedEmail,
      });
      return new NextResponse("User already exists", { status: 400 });
    }

    let pendingRole = await prisma.role.findUnique({
      where: { name: RoleName.PENDING },
      select: { id: true, name: true },
    });

    if (!pendingRole) {
      pendingRole = await prisma.role.create({
        data: {
          name: RoleName.PENDING,
          description: "Awaiting admin role assignment",
        },
        select: { id: true, name: true },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          status: UserStatus.ACTIVE,
          onboardingStatus: OnboardingStatus.PENDING_PROFILE,
        },
        select: {
          id: true,
          email: true,
          onboardingStatus: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.emailCredential.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          passwordHash,
        },
      });

      await tx.userRoleHistory.create({
        data: {
          userId: user.id,
          roleId: pendingRole.id,
        },
      });

      return user;
    });

    console.info("REGISTER_SUCCESS", {
      ip,
      userAgent,
      userId: created.id,
      email: created.email,
      createdAt: created.createdAt,
    });

    return NextResponse.json({
      id: created.id,
      email: created.email,
      status: created.status,
      onboardingStatus: created.onboardingStatus,
      createdAt: created.createdAt,
      nextStep: "redirect_to_pending_profile_page",
    });
  } catch (err) {
    console.error("REGISTRATION_ERROR", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

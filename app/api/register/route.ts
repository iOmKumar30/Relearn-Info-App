import prisma from "@/libs/prismadb";
import { OnboardingStatus, RoleName, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400 });
    }
    if (typeof password !== "string" || password.length < 6) {
      return new NextResponse("Password too short", { status: 400 });
    }

    // 1) check existing
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
      cacheStrategy: { ttl: 60, swr: 60 },
    });
    if (existingByEmail) {
      return new NextResponse("User already exists", { status: 400 });
    }

    // 2) ensure PENDING role exists (idempotent)
    let pendingRole = await prisma.role.findUnique({
      where: { name: RoleName.PENDING },
      select: { id: true, name: true },
      cacheStrategy: { ttl: 60, swr: 60 },
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

    // 3) hash and create everything in a transaction
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      // create minimal user (no name/phone/address yet)
      const user = await tx.user.create({
        data: {
          email,
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

      // create local credential
      await tx.emailCredential.create({
        data: {
          userId: user.id,
          email, // login email
          passwordHash, // argon2/bcrypt hash only
        },
      });

      // attach PENDING role
      await tx.userRoleHistory.create({
        data: {
          userId: user.id,
          roleId: pendingRole.id,
          // startDate defaults to now()
          // endDate: null means currently active entry for PENDING
        },
      });

      return user;
    });

    // 4) safe response (no secrets)
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

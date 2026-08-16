import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { OnboardingStatus, RoleName, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const TEMPORARY_PASSWORD = "WelcomeToRelf";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { id } = await params;
    const intern = await prisma.intern.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        mobile: true,
        address: true,
        gender: true,
      },
    });

    if (!intern) return new NextResponse("Intern not found", { status: 404 });
    if (intern.userId) {
      return new NextResponse("This intern already has a user account", { status: 409 });
    }

    const email = intern.email?.trim().toLowerCase();
    if (!email) {
      return new NextResponse("An email address is required to create a user account", { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return new NextResponse("A user account already exists for this email", { status: 409 });
    }

    const passwordHash = await bcrypt.hash(TEMPORARY_PASSWORD, 10);
    const createdUser = await prisma.$transaction(async (tx) => {
      const memberRole = await tx.role.upsert({
        where: { name: RoleName.MEMBER },
        update: {},
        create: {
          name: RoleName.MEMBER,
          description: "Members, including interns with app access",
        },
        select: { id: true },
      });
      const user = await tx.user.create({
        data: {
          name: intern.name,
          email,
          phone: intern.mobile,
          address: intern.address,
          gender: intern.gender,
          status: UserStatus.ACTIVE,
          onboardingStatus: OnboardingStatus.ACTIVE,
          activatedAt: new Date(),
          emailCredential: {
            create: { email, passwordHash },
          },
        },
        select: { id: true, email: true },
      });

      await tx.userRoleHistory.create({
        data: {
          userId: user.id,
          roleId: memberRole.id,
          startDate: new Date(),
        },
      });

      const linked = await tx.intern.updateMany({
        where: { id: intern.id, userId: null },
        data: { userId: user.id },
      });
      if (linked.count !== 1) {
        throw new Error("Intern was linked to another user while creating this account");
      }

      return user;
    });

    console.info("INTERN_USER_CREATED", {
      actorId: session.user.id,
      internId: intern.id,
      userId: createdUser.id,
    });

    return NextResponse.json({
      id: createdUser.id,
      email: createdUser.email,
      temporaryPassword: TEMPORARY_PASSWORD,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return new NextResponse("A user account already exists for this email", { status: 409 });
    }

    console.error("CREATE_INTERN_USER_ERROR", {
      actorId: session.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new NextResponse("Unable to create the user account", { status: 500 });
  }
}

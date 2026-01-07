import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { OnboardingStatus, RoleName } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
// import { sendApprovalEmail } from "@/libs/mailer";

type ApprovePayload = {
  roles: RoleName[]; // roles to grant, e.g., ["TUTOR","FACILITATOR"]
  note?: string; // optional audit note
};

export async function POST(
  req: Request,
  // Important: params must be awaited in Next.js dynamic route handlers
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return new NextResponse("Unauthorized", { status: 401 });

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        roleHistory: {
          where: { endDate: null },
          select: { role: { select: { name: true } } },
        },
      },
      cacheStrategy: { ttl: 60, swr: 60 },
    });

    // better not to use react hooks in api routes
    const isAdmin =
      me?.roleHistory?.some((r) => r.role.name === "ADMIN") ?? false;
    if (!isAdmin) return new NextResponse("Forbidden", { status: 403 });

    const body = (await req.json()) as ApprovePayload;

    // Validate payload
    if (!userId || !Array.isArray(body?.roles) || body.roles.length === 0) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    // Validate roles against RoleName enum and deduplicate
    const allowedRoleNames = new Set(Object.values(RoleName));
    const invalidRoles = body.roles.filter(
      (r) => !allowedRoleNames.has(r as RoleName)
    );
    if (invalidRoles.length > 0) {
      return new NextResponse(
        `One or more roles are invalid: ${invalidRoles.join(", ")}`,
        { status: 400 }
      );
    }
    const uniqueRoles = Array.from(new Set(body.roles)) as RoleName[];

    // Prepare roles to attach - pass only valid RoleName enum values to Prisma
    const dbRoles = await prisma.role.findMany({
      where: { name: { in: uniqueRoles } },
      select: { id: true, name: true },
      cacheStrategy: { ttl: 60, swr: 60 },
    });
    if (dbRoles.length !== uniqueRoles.length) {
      return new NextResponse("One or more roles are invalid", { status: 400 });
    }

    const pendingRole = await prisma.role.findUnique({
      where: { name: RoleName.PENDING },
      select: { id: true },
      cacheStrategy: { ttl: 60, swr: 60 },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Load user and current open role history
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          onboardingStatus: true,
          roleHistory: {
            where: { endDate: null },
            select: { id: true, roleId: true },
          },
        },
      });
      if (!user) throw new Error("User not found");

      // Close PENDING role if open
      if (pendingRole) {
        const openPending = user.roleHistory.find(
          (rh) => rh.roleId === pendingRole.id
        );
        if (openPending) {
          await tx.userRoleHistory.update({
            where: { id: openPending.id },
            data: { endDate: new Date() },
          });
        }
      }

      // Create new role history rows for approved roles (open intervals)
      for (const r of dbRoles) {
        await tx.userRoleHistory.create({
          data: {
            userId: user.id,
            roleId: r.id,
            startDate: new Date(),
            // endDate null means active
          },
        });
      }

      // Flip onboarding to ACTIVE
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          onboardingStatus: OnboardingStatus.ACTIVE,
          activatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          onboardingStatus: true,
          activatedAt: true,
        },
      });

      return updated;
    });

    // Send approval email with re-login link
    // Implement sendApprovalEmail using your email provider (Resend, SES, SendGrid, etc.)
    /*  try {
      if (result.email) {
        const loginUrl = process.env.NEXT_PUBLIC_BASE_URL
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`
          : `${new URL(req.url).origin}/auth/login`;
        await sendApprovalEmail({
          to: result.email,
          loginUrl,
          rolesGranted: uniqueRoles,
        });
      }
    } catch (mailErr) {
      // Do not fail the approval flow if email fails; log for ops
      console.error("MAIL_ERROR", mailErr);
    } */

    return NextResponse.json({
      ok: true,
      userId: result.id,
      onboardingStatus: result.onboardingStatus,
      activatedAt: result.activatedAt,
      rolesGranted: uniqueRoles,
    });
  } catch (err: any) {
    console.error("APPROVE_ROLE_ERROR", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

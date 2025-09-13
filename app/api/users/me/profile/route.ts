import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { OnboardingStatus } from "@prisma/client";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function clampStr(v: string | undefined | null, max = 500) {
  if (!v) return null;
  const t = v.toString().trim();
  return t.length ? t.slice(0, max) : null;
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    const rawName = body?.name;
    if (!isNonEmptyString(rawName)) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const name = clampStr(rawName, 200) as string;
    const phone = clampStr(body?.phone, 20);
    const address = clampStr(body?.address, 500);

    const userId = session.user.id;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: userId },
        select: { onboardingStatus: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const nextData: any = { name, phone, address };

      // Advance onboarding only if currently at PENDING_PROFILE
      if (existing.onboardingStatus === OnboardingStatus.PENDING_PROFILE) {
        nextData.onboardingStatus = OnboardingStatus.SUBMITTED_PROFILE;
        nextData.roleRequestedAt = new Date();
        nextData.profileSubmittedAt = new Date();
      }

      return tx.user.update({
        where: { id: userId },
        data: nextData,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          address: true,
          onboardingStatus: true,
          roleRequestedAt: true,
          profileSubmittedAt: true,
          updatedAt: true,
        },
      });
    });

    // If transaction returned a Response (404), forward it
    if (updated instanceof Response) return updated;

    return NextResponse.json(updated);
  } catch (err) {
    console.error("UPSERT_PROFILE_ERROR", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/*
 * POST aliases PUT for clients preferring POST.
 * This is done to support clients that may only support POST requests
 */
export async function POST(req: Request) {
  return PUT(req);
}


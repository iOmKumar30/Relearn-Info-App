import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { MemberType, UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function currentAnnualFeePeriods(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const currentFiscalStartYear = month >= 4 ? year : year - 1;

  const fiscalLabels = [0, 1, 2].map((offset) => {
    const startYear = currentFiscalStartYear - offset;
    return `${startYear}-${startYear + 1}`;
  });

  return {
    fiscalLabels,
    oldestPeriodStart: new Date(
      Date.UTC(currentFiscalStartYear - 2, 3, 1),
    ),
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { fiscalLabels, oldestPeriodStart } = currentAnnualFeePeriods();
    const now = new Date();

    const deactivatedCount = await prisma.$transaction(async (tx) => {
      const overdueMembers = await tx.member.findMany({
        where: {
          memberType: MemberType.ANNUAL,
          joiningDate: { lte: oldestPeriodStart },
          user: { status: UserStatus.ACTIVE },
          fees: {
            none: {
              fiscalLabel: { in: fiscalLabels },
            },
          },
        },
        select: { userId: true },
      });

      const userIds = overdueMembers.map((member) => member.userId);
      if (userIds.length === 0) return 0;

      const updated = await tx.user.updateMany({
        where: { id: { in: userIds }, status: UserStatus.ACTIVE },
        data: { status: UserStatus.INACTIVE },
      });

      await tx.userRoleHistory.updateMany({
        where: { userId: { in: userIds }, endDate: null },
        data: { endDate: now },
      });

      return updated.count;
    });

    console.info("ANNUAL_MEMBER_OVERDUE_DEACTIVATION", {
      actorId: session.user.id,
      fiscalLabels,
      deactivatedCount,
    });

    return NextResponse.json({
      deactivatedCount,
      fiscalLabels,
    });
  } catch (error) {
    console.error("ANNUAL_MEMBER_OVERDUE_DEACTIVATION_ERROR", {
      actorId: session.user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Unable to deactivate overdue annual members." },
      { status: 500 },
    );
  }
}

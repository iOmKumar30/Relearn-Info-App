import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import { swapMemberIdPrefix } from "@/libs/memberIdUtils";
import prisma from "@/libs/prismadb";
import { toUTCDate } from "@/libs/toUTCDate";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Member details and fees (with amount)
// PUT: Update Annual Member
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization Check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  // Admin Check
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  // Extract Member ID from params
  const { id } = await params;

  try {
    // Extract data from request body
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const pan = String(body.pan || "").trim();
    const joiningDate = body.joiningDate
      ? toUTCDate(body.joiningDate)
      : undefined;
    const feesInput = body.fees || {};

    // Expect typeHistory array from frontend
    const typeHistoryInput = Array.isArray(body.typeHistory)
      ? body.typeHistory
      : [];

    // Optimization: Read everything outside the transaction

    // fetch member and history in parallel
    const [member, existingHistory] = await Promise.all([
      prisma.member.findUnique({
        where: { id },
        select: { userId: true, memberId: true, memberType: true },
        cacheStrategy: { ttl: 60, swr: 60 },
      }),
      prisma.memberTypeHistory.findMany({
        where: { memberId: id },
        select: { id: true },
        cacheStrategy: { ttl: 60, swr: 60 },
        // We only need IDs to check for deletion
      }),
    ]);

    if (!member) return new NextResponse("Member not found", { status: 404 });

    // pre calculate the logic
    // Calculate Deletions
    const existingIds = existingHistory.map((h) => h.id);
    const incomingIds = typeHistoryInput
      .filter((h: any) => h.id)
      .map((h: any) => h.id);
    const idsToDelete = existingIds.filter(
      (dbId) => !incomingIds.includes(dbId)
    );

    // Sort input by date descending
    const sortedInput = [...typeHistoryInput].sort((a: any, b: any) => {
      const aDate = a.startDate
        ? new Date(`${a.startDate}T00:00:00.000Z`).getTime()
        : 0;
      const bDate = b.startDate
        ? new Date(`${b.startDate}T00:00:00.000Z`).getTime()
        : 0;
      return bDate - aDate;
    });
    const activeEntry = sortedInput.find((h) => !h.endDate) || sortedInput[0];
    const targetType = activeEntry?.memberType;

    // Calculate Fee Payloads
    const feeUpserts = Object.entries(feesInput)
      .map(([label, data]) => {
        let dateStr: string | null = null;
        let amountVal: number | null = null;

        if (typeof data === "string") {
          dateStr = data;
        } else if (typeof data === "object" && data !== null) {
          dateStr = (data as any).date;
          amountVal = (data as any).amount
            ? Number((data as any).amount)
            : null;
        }
        if (!dateStr) return null;
        const paidOn = toUTCDate(dateStr);
        if (isNaN(paidOn.getTime())) return null;

        return {
          where: { memberId_fiscalLabel: { memberId: id, fiscalLabel: label } },
          update: { paidOn, amount: amountVal },
          create: {
            memberId: id,
            fiscalLabel: label,
            paidOn,
            amount: amountVal,
          },
        };
      })
      .filter(Boolean);

    await prisma.$transaction(
      async (tx) => {
        // A. Update Member
        await tx.member.update({
          where: { id },
          data: {
            pan: pan || null,
            joiningDate,
          },
        });

        // B. Update User
        if (name || phone) {
          await tx.user.update({
            where: { id: member.userId },
            data: {
              name: name || undefined,
              phone: phone || undefined,
            },
          });
        }

        // C. Delete History
        if (idsToDelete.length > 0) {
          await tx.memberTypeHistory.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }

        // D. Upsert History
        for (const entry of typeHistoryInput) {
          const startDate = toUTCDate(entry.startDate);
          const endDate = toUTCDate(entry.endDate);
          const payload = {
            memberId: id,
            memberType: entry.memberType,
            startDate, 
            endDate,
            changedBy: session.user.id,
          };

          if (entry.id) {
            await tx.memberTypeHistory.update({
              where: { id: entry.id },
              data: payload,
            });
          } else {
            await tx.memberTypeHistory.create({
              data: payload,
            });
          }
        }

        // E. Update Member Type & ID (Using our pre-calculated targetType)
        if (targetType) {
          const updateData: any = { memberType: targetType };

          if (targetType !== member.memberType) {
            const newMemberId = swapMemberIdPrefix(member.memberId, targetType);
            if (newMemberId !== member.memberId) {
              updateData.memberId = newMemberId;
            }
          }

          await tx.member.update({
            where: { id },
            data: updateData,
          });
        }

        // F. Fee Upserts
        // Use Promise.all for parallel execution inside transaction
        if (feeUpserts.length > 0) {
          await Promise.all(feeUpserts.map((f: any) => tx.memberFee.upsert(f)));
        }
      },
      {
        maxWait: 5000,
        timeout: 10000, // You can likely lower this back to 10000 now
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("UPDATE_ANNUAL_MEMBER_ERROR", error);
    return new NextResponse(error.message || "Failed to update member", {
      status: 500,
    });
  }
}
// DELETE: Remove Member record (keeps User, but removes Member role)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;

  try {
    // Cascade delete in schema will handle fees.
    await prisma.member.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE_ANNUAL_MEMBER_ERROR", error);
    return new NextResponse(error.message || "Failed to delete member", {
      status: 500,
    });
  }
}

import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import { swapMemberIdPrefix } from "@/libs/memberIdUtils";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Member details and fees (with amount)
// PUT: Update Annual Member
export async function PUT(
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
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const pan = String(body.pan || "").trim();
    const joiningDateStr = body.joiningDate;
    const feesInput = body.fees || {};

    // Expect typeHistory array from frontend
    const typeHistoryInput = Array.isArray(body.typeHistory)
      ? body.typeHistory
      : [];

    await prisma.$transaction(
      async (tx) => {
        const member = await tx.member.findUnique({
          where: { id },
          select: { userId: true, memberId: true, memberType: true }, // Select memberId & type to check later
        });
        if (!member) throw new Error("Member not found");

        // 1. Update Basic Member Info
        await tx.member.update({
          where: { id },
          data: {
            pan: pan || null,
            joiningDate: joiningDateStr ? new Date(joiningDateStr) : undefined,
          },
        });

        // 2. Update User Info
        if (name || phone) {
          await tx.user.update({
            where: { id: member.userId },
            data: {
              name: name || undefined,
              phone: phone || undefined,
            },
          });
        }

        // 3. Handle Type History Sync
        // A. Get existing DB records to determine what to delete
        const existingHistory = await tx.memberTypeHistory.findMany({
          where: { memberId: id },
          select: { id: true },
        });
        const existingIds = existingHistory.map((h) => h.id);
        const incomingIds = typeHistoryInput
          .filter((h: any) => h.id)
          .map((h: any) => h.id);

        // B. Delete records not in payload
        const idsToDelete = existingIds.filter(
          (dbId) => !incomingIds.includes(dbId)
        );
        if (idsToDelete.length > 0) {
          await tx.memberTypeHistory.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }

        // C. Upsert (Create or Update) records from payload
        for (const entry of typeHistoryInput) {
          const payload = {
            memberId: id,
            memberType: entry.memberType,
            startDate: entry.startDate ? new Date(entry.startDate) : new Date(),
            endDate: entry.endDate ? new Date(entry.endDate) : null,
            changedBy: session.user.id,
          };

          if (entry.id) {
            // Update existing
            await tx.memberTypeHistory.update({
              where: { id: entry.id },
              data: payload,
            });
          } else {
            // Create new
            await tx.memberTypeHistory.create({
              data: payload,
            });
          }
        }

        // D. Auto-Correct current MemberType based on latest Active History
        const activeRecord = await tx.memberTypeHistory.findFirst({
          where: { memberId: id, endDate: null },
        });

        const latestHistory = await tx.memberTypeHistory.findFirst({
          where: { memberId: id },
          orderBy: { startDate: "desc" },
        });

        const targetType =
          activeRecord?.memberType || latestHistory?.memberType;

        if (targetType) {
          const updateData: any = { memberType: targetType };

          // --- NEW LOGIC START: Swap ID Prefix if Type Changed ---
          if (targetType !== member.memberType) {
            const newMemberId = swapMemberIdPrefix(member.memberId, targetType);
            if (newMemberId !== member.memberId) {
              updateData.memberId = newMemberId;
            }
          }
          // --- NEW LOGIC END ---

          await tx.member.update({
            where: { id },
            data: updateData,
          });
        }

        // 4. Handle Fees
        const feePromises = Object.entries(feesInput).map(([label, data]) => {
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
          const paidOn = new Date(dateStr);
          if (isNaN(paidOn.getTime())) return null;

          return tx.memberFee.upsert({
            where: {
              memberId_fiscalLabel: { memberId: id, fiscalLabel: label },
            },
            update: { paidOn, amount: amountVal },
            create: {
              memberId: id,
              fiscalLabel: label,
              paidOn,
              amount: amountVal,
            },
          });
        });

        const validFeePromises = feePromises.filter((p) => p !== null);
        if (validFeePromises.length > 0) {
          await Promise.all(validFeePromises);
        }
      },
      {
        maxWait: 5000,
        timeout: 20000,
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

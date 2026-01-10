import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import { swapMemberIdPrefix } from "@/libs/memberIdUtils";
import prisma from "@/libs/prismadb";
import { toUTCDate } from "@/libs/toUTCDate";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Life Member details and fees (with amount)
// PUT: Update Life Member
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id)))
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const pan = String(body.pan || "").trim();
    const joiningDate = body.joiningDate
      ? toUTCDate(body.joiningDate)
      : undefined;
    const feesInput = body.fees || {};

    const typeHistoryInput = Array.isArray(body.typeHistory)
      ? body.typeHistory
      : [];

    // --- OPTIMIZATION STEP 1: READ EVERYTHING OUTSIDE TRANSACTION ---

    // 1. Fetch Member & History in parallel
    const [member, existingHistory] = await Promise.all([
      prisma.member.findUnique({
        where: { id },
        select: { userId: true, memberId: true, memberType: true },
        cacheStrategy: { ttl: 60, swr: 60 },
      }),
      prisma.memberTypeHistory.findMany({
        where: { memberId: id },
        select: { id: true }, // Only need IDs for deletion logic
        cacheStrategy: { ttl: 60, swr: 60 },
      }),
    ]);

    if (!member) return new NextResponse("Member not found", { status: 404 });

    // --- OPTIMIZATION STEP 2: PRE-CALCULATE LOGIC (CPU Bound) ---

    // A. Logic for History Deletions
    const existingIds = existingHistory.map((h) => h.id);
    const incomingIds = typeHistoryInput
      .filter((h: any) => h.id)
      .map((h: any) => h.id);
    const idsToDelete = existingIds.filter(
      (dbId) => !incomingIds.includes(dbId)
    );

    // B. Logic for Target Member Type
    // Instead of querying DB again, we calculate it from the INCOMING payload.
    // Sort input by date descending to find the latest/active one.
    const sortedInput = [...typeHistoryInput].sort((a: any, b: any) => {
      const aDate = a.startDate
        ? new Date(`${a.startDate}T00:00:00.000Z`).getTime()
        : 0;
      const bDate = b.startDate
        ? new Date(`${b.startDate}T00:00:00.000Z`).getTime()
        : 0;
      return bDate - aDate;
    });
    // Find one without endDate (Active), or default to the most recent start date
    const activeEntry = sortedInput.find((h) => !h.endDate) || sortedInput[0];
    const targetType = activeEntry?.memberType;

    // C. Logic for Fees (Prepare the Upsert objects)
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
      .filter(Boolean); // Filter out nulls

    // --- OPTIMIZATION STEP 3: TRANSACTION (WRITES ONLY) ---
    // Fast execution because no waiting for reads

    await prisma.$transaction(
      async (tx) => {
        // 1. Update Basic Member Info
        await tx.member.update({
          where: { id },
          data: {
            pan: pan || null,
            joiningDate,
          },
        });

        // 2. Update User Info
        if (name || phone) {
          await tx.user.update({
            where: { id: member.userId },
            data: { name: name || undefined, phone: phone || undefined },
          });
        }

        // 3. Delete Removed History
        if (idsToDelete.length > 0) {
          await tx.memberTypeHistory.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }

        // 4. Upsert (Create/Update) History
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

        // 5. Update Member Type & ID (Using pre-calculated targetType)
        if (targetType) {
          const updateData: any = { memberType: targetType };

          // Swap Logic
          if (targetType !== member.memberType) {
            const newMemberId = swapMemberIdPrefix(member.memberId, targetType);
            if (newMemberId && newMemberId !== member.memberId) {
              updateData.memberId = newMemberId;
            }
          }

          await tx.member.update({
            where: { id },
            data: updateData,
          });
        }

        // 6. Handle Fees (Parallel Upserts)
        if (feeUpserts.length > 0) {
          await Promise.all(feeUpserts.map((f: any) => tx.memberFee.upsert(f)));
        }
      },
      {
        maxWait: 5000,
        timeout: 10000, // Safe to lower back to 10s
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

// DELETE: Remove Member record
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id)))
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    await prisma.member.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

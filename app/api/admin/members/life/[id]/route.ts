import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import { swapMemberIdPrefix } from "@/libs/memberIdUtils";
import prisma from "@/libs/prismadb";
import { toUTCDate } from "@/libs/toUTCDate";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Life Member details and fees (with amount)
// PUT: Update Life Member
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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
        // cacheStrategy: { ttl: 60, swr: 60 },
      }),
      prisma.memberTypeHistory.findMany({
        where: { memberId: id },
        select: { id: true }, // Only need IDs for deletion logic
        // cacheStrategy: { ttl: 60, swr: 60 },
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
      (dbId) => !incomingIds.includes(dbId),
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

        // 4. Upsert History
        for (const entry of typeHistoryInput) {
          if (!entry.memberType) continue;

          const startDate = toUTCDate(entry.startDate);
          const endDate = toUTCDate(entry.endDate);

          const payload: any = {
            memberId: id,
            memberType: entry.memberType,
            changedBy: session.user.id,
          };

          if (startDate !== undefined) payload.startDate = startDate;
          if (endDate !== undefined) payload.endDate = endDate;

          try {
            if (entry.id) {
              // Try UPDATE first
              await tx.memberTypeHistory.update({
                where: { id: entry.id },
                data: payload,
              });
            } else {
              // CREATE new record
              payload.startDate = startDate || new Date();
              await tx.memberTypeHistory.create({
                data: payload,
              });
            }
          } catch (error: any) {
            // If UPDATE fails (record was deleted), CREATE instead
            if (entry.id && error.code === "P2025") {
              payload.startDate = startDate || new Date();
              await tx.memberTypeHistory.create({
                data: payload,
              });
            } else {
              throw error; // Re-throw other errors
            }
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
        // F. Handle Fees (COMPLETE: Delete ALL + recreate specified)
        const feeOperations: any[] = [];

        // 1. FIRST: Delete ALL fees for this member (clean slate)
        feeOperations.push(
          tx.memberFee.deleteMany({
            where: { memberId: id },
          }),
        );
        console.log(`DELETE ALL fees for member ${id}`);

        // 2. THEN: Only recreate fees that have VALID dates from frontend
        Object.entries(feesInput).forEach(([label, data]) => {
          const dateStr =
            typeof data === "string"
              ? data.trim()
              : (data as any)?.date?.toString().trim();

          const hasValidDate =
            dateStr && dateStr !== "null" && dateStr.length > 0;

          if (hasValidDate) {
            // Only recreate if date is valid
            feeOperations.push(
              tx.memberFee.upsert({
                where: {
                  memberId_fiscalLabel: { memberId: id, fiscalLabel: label },
                },
                update: {
                  paidOn: toUTCDate(dateStr),
                  amount: (data as any)?.amount
                    ? Number((data as any).amount)
                    : null,
                },
                create: {
                  fiscalLabel: label,
                  paidOn: toUTCDate(dateStr),
                  amount: (data as any)?.amount
                    ? Number((data as any).amount)
                    : null,
                  member: { connect: { id } },
                },
              }),
            );
            console.log(`CREATE: ${label}`);
          } else {
            console.log(`SKIP: ${label} (no valid date)`);
          }
        });

        await Promise.all(feeOperations);
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );
    revalidatePath("/api/admin/members/life");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

// DELETE: Remove Member record
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

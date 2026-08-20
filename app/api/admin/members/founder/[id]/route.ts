import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { toUTCDate } from "@/libs/toUTCDate";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FeeChange = {
  fiscalLabel: string;
  paidOn: Date | null;
  amount: number | null;
};

function parseFeeChanges(value: unknown): FeeChange[] | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid membership fee data");
  }

  return Object.entries(value).map(([rawLabel, rawFee]) => {
    const fiscalLabel = rawLabel.trim();
    if (!fiscalLabel) throw new Error("Invalid fiscal year");

    const fee: { date?: unknown; amount?: unknown } =
      rawFee && typeof rawFee === "object" && !Array.isArray(rawFee)
        ? (rawFee as { date?: unknown; amount?: unknown })
        : { date: rawFee };
    const dateValue = typeof fee.date === "string" ? fee.date.trim() : "";
    const paidOn = dateValue ? toUTCDate(dateValue) : null;
    if (dateValue && !paidOn) throw new Error("Invalid payment date");

    const hasAmount = fee.amount !== undefined && fee.amount !== null && fee.amount !== "";
    const amount = hasAmount ? Number(fee.amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      throw new Error("Invalid payment amount");
    }

    return { fiscalLabel, paidOn, amount };
  });
}

// PUT: Update Founder Member details and yearly fee payments.
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
    const joiningDate = body.joiningDate
      ? toUTCDate(body.joiningDate)
      : undefined;
    const feeChanges = parseFeeChanges(body.fees);

    await prisma.$transaction(
      async (tx) => {
        // 1. Check existence
        const member = await tx.member.findUnique({
          where: { id },
          select: { userId: true },
        });
        if (!member) throw new Error("Founder Member not found");

        // 2. Update Member Record
        await tx.member.update({
          where: { id },
          data: {
            pan: pan || null,
            joiningDate,
          },
        });

        // 3. Update User Record (Name/Phone)
        if (name || phone) {
          await tx.user.update({
            where: { id: member.userId },
            data: {
              name: name || undefined,
              phone: phone || undefined,
            },
          });
        }

        if (feeChanges) {
          await Promise.all(
            feeChanges.map((fee) => {
              if (!fee.paidOn) {
                return tx.memberFee.deleteMany({
                  where: { memberId: id, fiscalLabel: fee.fiscalLabel },
                });
              }

              return tx.memberFee.upsert({
                where: {
                  memberId_fiscalLabel: {
                    memberId: id,
                    fiscalLabel: fee.fiscalLabel,
                  },
                },
                update: { paidOn: fee.paidOn, amount: fee.amount },
                create: {
                  memberId: id,
                  fiscalLabel: fee.fiscalLabel,
                  paidOn: fee.paidOn,
                  amount: fee.amount,
                },
              });
            }),
          );
        }
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("UPDATE_FOUNDER_MEMBER_ERROR", error);
    return new NextResponse(
      error.message || "Failed to update founder member",
      {
        status: 500,
      }
    );
  }
}

// DELETE: Remove Member record (Keeps User)
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
    // We do NOT delete the User, just the Member record.
    await prisma.member.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE_FOUNDER_MEMBER_ERROR", error);
    return new NextResponse(
      error.message || "Failed to delete founder member",
      {
        status: 500,
      }
    );
  }
}

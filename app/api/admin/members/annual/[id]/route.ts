import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Member details and fees
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
    const feesInput = body.fees || {}; // { "2023-2024": "2023-01-01" }

    await prisma.$transaction(async (tx) => {
      // 1. Get current member to find linked user
      const member = await tx.member.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!member) throw new Error("Member not found");

      // 2. Update Member fields
      await tx.member.update({
        where: { id },
        data: {
          pan: pan || null,
          joiningDate: joiningDateStr ? new Date(joiningDateStr) : undefined,
        },
      });

      // 3. Update User fields (Name/Phone)
      if (name || phone) {
        await tx.user.update({
          where: { id: member.userId },
          data: {
            name: name || undefined,
            phone: phone || undefined,
          },
        });
      }

      // 4. Update Fees
      // We iterate through all provided keys. If a date is provided, upsert.
      // If explicit null/empty passed for a key that exists, we could delete, but usually we just overwrite valid dates.
      for (const [label, dateStr] of Object.entries(feesInput)) {
        if (!dateStr) {
          // Optional: logic to remove fee if passed as empty string?
          // For now, let's assume we only upsert valid dates.
          continue;
        }
        const paidOn = new Date(dateStr as string);
        if (isNaN(paidOn.getTime())) continue;

        await tx.memberFee.upsert({
          where: { memberId_fiscalLabel: { memberId: id, fiscalLabel: label } },
          update: { paidOn },
          create: { memberId: id, fiscalLabel: label, paidOn },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("UPDATE_ANNUAL_MEMBER_ERROR", error);
    return new NextResponse(error.message || "Failed to update member", {
      status: 500,
    });
  }
}

// DELETE: Remove Member record : keeps User, but removes Member role 
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
    // We do NOT delete the User, just the Member record.
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

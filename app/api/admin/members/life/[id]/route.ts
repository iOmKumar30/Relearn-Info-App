import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    const joiningDateStr = body.joiningDate;
    const feesInput = body.fees || {};

    await prisma.$transaction(
      async (tx) => {
        const member = await tx.member.findUnique({
          where: { id },
          select: { userId: true },
        });
        if (!member) throw new Error("Member not found");

        await tx.member.update({
          where: { id },
          data: {
            pan: pan || null,
            joiningDate: joiningDateStr ? new Date(joiningDateStr) : undefined,
          },
        });

        if (name || phone) {
          await tx.user.update({
            where: { id: member.userId },
            data: { name: name || undefined, phone: phone || undefined },
          });
        }

        const feePromises = Object.entries(feesInput).map(
          ([label, dateStr]) => {
            if (!dateStr) return null;
            const paidOn = new Date(dateStr as string);
            if (isNaN(paidOn.getTime())) return null;
            return tx.memberFee.upsert({
              where: {
                memberId_fiscalLabel: { memberId: id, fiscalLabel: label },
              },
              update: { paidOn },
              create: { memberId: id, fiscalLabel: label, paidOn },
            });
          }
        );
        const validFeePromises = feePromises.filter((p) => p !== null);
        if (validFeePromises.length > 0) await Promise.all(validFeePromises);
      },
      { maxWait: 5000, timeout: 20000 }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

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

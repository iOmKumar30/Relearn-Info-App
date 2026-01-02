import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Founder Member details (No fees)
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
            joiningDate: joiningDateStr ? new Date(joiningDateStr) : undefined,
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

import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// --- GET Single Receipt ---
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const row = await prisma.gstReceipt.findUnique({
      where: { id },
      // Select all fields or specify specific ones if needed
      // Ideally, we want 'items' (JSON) included for the edit form
    });

    if (!row) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GST_RECEIPT_GET_ID_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// --- DELETE Receipt ---
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    await prisma.gstReceipt.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GST_RECEIPT_DELETE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

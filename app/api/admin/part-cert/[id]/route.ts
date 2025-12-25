import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;

  const row = await prisma.participationCertificate.findUnique({
    where: { id },
    select: {
      id: true,
      type: true, // Added
      certificateNo: true,
      name: true,
      aadhaar: true,
      classYear: true,
      institute: true,
      eventName: true, // Added
      duration: true,
      startDate: true,
      endDate: true,
      issueDate: true,
      createdAt: true,
    },
  });

  if (!row) return new NextResponse("Not Found", { status: 404 });

  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;

  try {
    await prisma.participationCertificate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return new NextResponse("Error deleting certificate", { status: 500 });
  }
}

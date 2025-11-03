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

  const row = await prisma.membershipCertificate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      year: true,
      dateIssued: true,
      certificateNo: true,
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
  await prisma.membershipCertificate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

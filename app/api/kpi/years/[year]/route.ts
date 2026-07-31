import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { year } = await ctx.params;
  const yearNum = Number(year);

  try {
    await prisma.kPIYear.delete({ where: { year: yearNum } });
    return NextResponse.json({ success: true });
  } catch {
    return new NextResponse("Year not found", { status: 404 });
  }
}
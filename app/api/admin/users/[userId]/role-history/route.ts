import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  const { userId } = await ctx.params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return new NextResponse("Not Found", { status: 404 });

  const rows = await prisma.userRoleHistory.findMany({
    where: { userId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      role: { select: { name: true } },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ rows });
}

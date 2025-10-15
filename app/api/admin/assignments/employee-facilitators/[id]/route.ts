// app/api/admin/assignments/employee-facilitators/[id]/route.ts
import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id?: string }> };

// DELETE link
export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  if (!id) return new NextResponse("Bad Request: missing id", { status: 400 });

  try {
    await prisma.facilitatorEmployee.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}

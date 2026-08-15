import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function ensureAnotherActiveAdmin(historyId: string, roleName: string) {
  if (roleName !== "ADMIN") return true;

  const otherActiveAdmin = await prisma.userRoleHistory.findFirst({
    where: {
      id: { not: historyId },
      endDate: null,
      role: { name: "ADMIN" },
      user: { status: "ACTIVE" },
    },
    select: { id: true },
  });
  return Boolean(otherActiveAdmin);
}

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: new NextResponse("Unauthorized", { status: 401 }) };
  if (!(await isAdmin(session.user.id))) return { error: new NextResponse("Forbidden", { status: 403 }) };
  return { error: null };
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ userId: string; historyId: string }> },
) {
  const authorization = await authorize();
  if (authorization.error) return authorization.error;

  const { userId, historyId } = await ctx.params;
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return new NextResponse("Invalid role history update", { status: 400 });
  }

  const input = body as { startDate?: unknown; endDate?: unknown };
  const startDate = parseDate(input.startDate);
  const endDate = input.endDate === null ? null : parseDate(input.endDate);
  if (!startDate || (input.endDate !== null && !endDate)) {
    return new NextResponse("Valid start and end dates are required", { status: 400 });
  }
  if (endDate && endDate < startDate) {
    return new NextResponse("End date cannot be before start date", { status: 400 });
  }

  const history = await prisma.userRoleHistory.findFirst({
    where: { id: historyId, userId },
    include: { role: { select: { id: true, name: true } }, user: { select: { status: true } } },
  });
  if (!history) return new NextResponse("Not Found", { status: 404 });
  if (!endDate && history.user.status !== "ACTIVE") {
    return new NextResponse("Cannot activate a role for an inactive user", { status: 400 });
  }
  if (history.endDate === null && endDate && !(await ensureAnotherActiveAdmin(history.id, history.role.name))) {
    return new NextResponse("Cannot end the last active administrator role", { status: 409 });
  }
  if (!endDate) {
    const duplicateActiveRole = await prisma.userRoleHistory.findFirst({
      where: { id: { not: historyId }, userId, roleId: history.roleId, endDate: null },
      select: { id: true },
    });
    if (duplicateActiveRole) {
      return new NextResponse("This user already has an active entry for this role", { status: 409 });
    }
  }

  const updated = await prisma.userRoleHistory.update({
    where: { id: historyId },
    data: { startDate, endDate },
    select: { id: true, startDate: true, endDate: true, role: { select: { name: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ userId: string; historyId: string }> },
) {
  const authorization = await authorize();
  if (authorization.error) return authorization.error;

  const { userId, historyId } = await ctx.params;
  const history = await prisma.userRoleHistory.findFirst({
    where: { id: historyId, userId },
    include: { role: { select: { name: true } } },
  });
  if (!history) return new NextResponse("Not Found", { status: 404 });
  if (history.endDate === null && !(await ensureAnotherActiveAdmin(history.id, history.role.name))) {
    return new NextResponse("Cannot delete the last active administrator role", { status: 409 });
  }

  await prisma.userRoleHistory.delete({ where: { id: historyId } });
  return new NextResponse(null, { status: 204 });
}

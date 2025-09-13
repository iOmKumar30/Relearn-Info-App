import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { ClassroomStatus, ClassTiming, SectionCode } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function isAdmin(userId?: string) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleHistory: { where: { endDate: null }, include: { role: true } },
    },
  });
  const names = u?.roleHistory?.map((h) => h.role.name) ?? [];
  return names.includes("ADMIN");
}

// GET /api/admin/classrooms/:id
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;
  const row = await prisma.classroom.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      centreId: true,
      centre: { select: { id: true, code: true, name: true, state: true } },
      section: true,
      timing: true,
      monthlyAllowance: true,
      status: true,
      dateCreated: true,
      dateClosed: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!row) return new NextResponse("Not Found", { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/admin/classrooms/:id (update editable fields; code is immutable)
export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;
  const body = await req.json();

  const data: any = {};
  if (body.section !== undefined) data.section = body.section as SectionCode; // change with caution
  if (body.timing !== undefined) data.timing = body.timing as ClassTiming;
  if (body.monthlyAllowance !== undefined)
    data.monthlyAllowance = Number(body.monthlyAllowance);
  if (body.status !== undefined) data.status = body.status as ClassroomStatus;
  if (body.dateCreated !== undefined)
    data.dateCreated = body.dateCreated
      ? new Date(body.dateCreated)
      : new Date();
  if (body.dateClosed !== undefined)
    data.dateClosed = body.dateClosed ? new Date(body.dateClosed) : null;

  try {
    const updated = await prisma.classroom.update({
      where: { id },
      data,
      select: {
        id: true,
        code: true,
        centreId: true,
        section: true,
        timing: true,
        monthlyAllowance: true,
        status: true,
        dateCreated: true,
        dateClosed: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return new NextResponse("Not Found", { status: 404 });
  }
}

// DELETE /api/admin/classrooms/:id
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = ctx.params;

  // prevent delete if student history exists 
  const hasHistory = await prisma.studentClassroomAssignment.count({
    where: { classroomId: id },
  });
  if (hasHistory > 0) {
    return new NextResponse(
      "Cannot delete Classroom with student history. Consider setting dateClosed and INACTIVE status.",
      { status: 409 }
    );
  }

  try {
    await prisma.classroom.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return new NextResponse("Not Found", { status: 404 });
  }
}

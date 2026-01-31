import { authOptions } from "@/libs/authOptions";
import { generateClassroomCode } from "@/libs/classroomCode";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { ClassroomStatus, ClassTiming, SectionCode } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/admin/classrooms/:id
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  const row = await prisma.classroom.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      centreId: true,
      centre: { select: { id: true, code: true, name: true, state: true } },
      section: true,
      streetAddress: true,
      city: true,
      district: true,
      state: true,
      pincode: true,
      timing: true,
      monthlyAllowance: true,
      status: true,
      dateCreated: true,
      dateClosed: true,
      createdAt: true,
      updatedAt: true,
    },
    // cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (!row) return new NextResponse("Not Found", { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/admin/classrooms/:id (update editable fields; code is immutable)
// PUT /api/admin/classrooms/:id (update editable fields; code auto-changes with section)
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json();

  // Prepare update fields from input
  const data: any = {};
  if (body.centreId !== undefined) data.centreId = String(body.centreId).trim();
  if (body.section !== undefined) data.section = body.section as SectionCode;
  if (body.timing !== undefined) data.timing = body.timing as ClassTiming;
  if (body.monthlyAllowance !== undefined)
    data.monthlyAllowance = Number(body.monthlyAllowance);
  if (body.status !== undefined) data.status = body.status as ClassroomStatus;
  if (body.streetAddress !== undefined)
    data.streetAddress = String(body.streetAddress).trim();
  if (body.city !== undefined) data.city = String(body.city).trim();
  if (body.district !== undefined) data.district = String(body.district).trim();
  if (body.state !== undefined) data.state = String(body.state).trim();
  if (body.pincode !== undefined) data.pincode = String(body.pincode).trim();
  if (body.dateCreated !== undefined)
    data.dateCreated = body.dateCreated
      ? new Date(body.dateCreated)
      : new Date();
  if (body.dateClosed !== undefined)
    data.dateClosed = body.dateClosed ? new Date(body.dateClosed) : null;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Fetch existing classroom for centreId and current section
      const current = await tx.classroom.findUnique({
        where: { id },
        select: { centreId: true, section: true },
      });
      if (!current) throw new Error("Not Found");

      let codeUpdate = {};

      // Determine the effective new centreId and section
      const newCentreId = data.centreId ?? current.centreId;
      const newSection = data.section ?? current.section;

      // Regenerate code if centreId OR section changes
      if (
        (data.centreId !== undefined && data.centreId !== current.centreId) ||
        (data.section !== undefined && data.section !== current.section)
      ) {
        const newCode = await generateClassroomCode(tx, newCentreId);
        codeUpdate = { code: newCode };
      }

      const updateData = { ...data, ...codeUpdate };

      return await tx.classroom.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          code: true,
          centreId: true,
          section: true,
          streetAddress: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
          timing: true,
          monthlyAllowance: true,
          status: true,
          dateCreated: true,
          dateClosed: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Classroom update error:", err);
    return new NextResponse("Not Found", { status: 404 });
  }
}

// DELETE /api/admin/classrooms/:id
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await ctx.params;

  // prevent delete if student history exists
  const hasHistory = await prisma.studentClassroomAssignment.count({
    where: { classroomId: id },
    // cacheStrategy: { ttl: 60, swr: 60 },
  });
  if (hasHistory > 0) {
    return new NextResponse(
      "Cannot delete Classroom with student history. Consider setting dateClosed and INACTIVE status.",
      { status: 409 },
    );
  }

  try {
    await prisma.classroom.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return new NextResponse("Not Found", { status: 404 });
  }
}

import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUT: Update Intern
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const body = await req.json();

    const { createdAt, updatedAt, id: _ignore, ...updateData } = body;

    if (updateData.gender === "") updateData.gender = null;
    if (updateData.workingMode === "") updateData.workingMode = null;
    if (updateData.institution === "") updateData.institution = null;

    const intern = await prisma.intern.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(intern);
  } catch (error: any) {
    console.error("UPDATE_INTERN_ERROR", error);
    return new NextResponse(
      JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// DELETE: Remove Intern
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    await prisma.intern.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("DELETE_INTERN_ERROR", error);
    return new NextResponse(
      JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import prisma from '@/libs/prismadb';
import { InternStatus, UserStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT: Update Intern
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  try {
    const body = await req.json();

    const {
      createdAt,
      updatedAt,
      id: _ignore,
      memberId: _memberId,
      userId: _userId,
      user: _user,
      ...updateData
    } = body;

    if (updateData.gender === '') updateData.gender = null;
    if (updateData.workingMode === '') updateData.workingMode = null;
    if (updateData.institution === '') updateData.institution = null;
    if (updateData.email !== undefined) {
      updateData.email = updateData.email
        ? String(updateData.email).trim().toLowerCase()
        : null;
    }

    const intern = await prisma.$transaction(async (tx) => {
      const existingIntern = await tx.intern.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existingIntern) throw new Error('Intern not found');

      const updatedIntern = await tx.intern.update({
        where: { id },
        data: updateData,
      });

      if (existingIntern.userId) {
        const existingCredential = await tx.emailCredential.findUnique({
          where: { userId: existingIntern.userId },
          select: { id: true },
        });

        if (!updatedIntern.email) {
          throw new Error('A linked intern must have an email address');
        }

        const userData: any = {
          name: updatedIntern.name,
          phone: updatedIntern.mobile,
          address: updatedIntern.address,
          gender: updatedIntern.gender,
        };

        if (updatedIntern.email) {
          userData.email = updatedIntern.email.trim().toLowerCase();
          if (existingCredential) {
            userData.emailCredential = {
              update: { email: userData.email },
            };
          }
        }

        if (updateData.status === InternStatus.COMPLETED) {
          userData.status = UserStatus.INACTIVE;
        } else if (updateData.status === InternStatus.ACTIVE) {
          userData.status = UserStatus.ACTIVE;
        }

        await tx.user.update({
          where: { id: existingIntern.userId },
          data: userData,
        });
      }

      return updatedIntern;
    });

    return NextResponse.json(intern);
  } catch (error: any) {
    console.error('UPDATE_INTERN_ERROR', error);
    return new NextResponse(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// DELETE: Remove Intern
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    await prisma.intern.delete({
      where: { id: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('DELETE_INTERN_ERROR', error);
    return new NextResponse(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

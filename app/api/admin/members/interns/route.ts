import { authOptions } from '@/libs/authOptions';
import { generateNextMemberId } from '@/libs/idGenerator';
import {
  INTERN_TEMPORARY_PASSWORD,
} from '@/libs/intern-user';
import { isAdmin } from '@/libs/isAdmin';
import prisma from '@/libs/prismadb';
import { toUTCDate } from '@/libs/toUTCDate';
import { InternStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!(await isAdmin(session.user.id))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get('pageSize') || 20)),
    );
    const q = (searchParams.get('q') || '').trim();
    const status = searchParams.get('status');

    const skip = (page - 1) * pageSize;

    const where: any = {
      ...(q
        ? {
            OR: [
              { memberId: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { institution: { contains: q, mode: 'insensitive' } },
              { previousInstitute: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (status && status !== 'ALL') {
      where.status = status as InternStatus;
    }

    const [total, rows] = await Promise.all([
      prisma.intern.count({ where }),
      prisma.intern.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { joiningDate: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        //  // cacheStrategy: { ttl: 60, swr: 60 },
      }),
    ]);

    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('INTERNS_GET_ERROR', error);
    return new NextResponse(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// POST: Create Intern
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = await req.json();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!name || !email) {
      return new NextResponse('Name and email are required', { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return new NextResponse('A user account already exists for this email', {
        status: 409,
      });
    }

    const memberRole = await prisma.role.upsert({
      where: { name: 'MEMBER' },
      update: {},
      create: { name: 'MEMBER', description: 'Members, including interns' },
      select: { id: true },
    });

    const passwordHash = await bcrypt.hash(INTERN_TEMPORARY_PASSWORD, 10);
    const parsedJoiningDate =
      typeof body.joiningDate === 'string'
        ? toUTCDate(body.joiningDate)
        : undefined;
    if (body.joiningDate && !parsedJoiningDate) {
      return new NextResponse('Invalid joining date', { status: 400 });
    }
    const joiningDate = parsedJoiningDate ?? new Date();

    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      memberId: _memberId,
      userId: _userId,
      user: _user,
      joiningDate: _rawJoiningDate,
      ...internData
    } = body;
    const result = await prisma.$transaction(async (tx) => {
      const newMemberId = await generateNextMemberId(tx, 'INTERN');

      const intern = await tx.intern.create({
        data: {
          ...internData,
          name,
          email,
          joiningDate,
          memberId: newMemberId,
          user: {
            create: {
              name,
              email,
              phone: body.mobile || null,
              address: body.address || null,
              gender: body.gender || null,
              status: 'ACTIVE',
              onboardingStatus: 'ACTIVE',
              activatedAt: new Date(),
              emailCredential: { create: { email, passwordHash } },
              roleHistory: { create: { roleId: memberRole.id } },
              member: {
                create: {
                  memberId: newMemberId,
                  memberType: 'INTERN',
                  joiningDate: joiningDate,
                  status: 'ACTIVE',
                  typeHistory: {
                    create: {
                      memberType: 'INTERN',
                      changedBy: session.user.id,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return intern;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return new NextResponse('A user account already exists for this email', {
        status: 409,
      });
    }
    console.error('CREATE_INTERN_ERROR', error);
    return new NextResponse(
      JSON.stringify({
        message: 'Internal Server Error',
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const years = await prisma.kPIYear.findMany({
    orderBy: { year: 'desc' },
  });

  const rows = await Promise.all(
    years.map(async (yearRow) => {
      const from = new Date(yearRow.year, 0, 1);
      const nextYear = new Date(yearRow.year + 1, 0, 1);

      const months = await prisma.kPIMonthlyValue.groupBy({
        by: ['month'],
        where: {
          month: {
            gte: from,
            lt: nextYear,
          },
        },
      });

      return {
        year: yearRow.year,
        createdAt: yearRow.createdAt.toISOString(),
        monthsWithData: months.length,
      };
    }),
  );

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const body = await req.json();
  const year = Number(body.year);

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return new NextResponse('Invalid year', { status: 400 });
  }

  try {
    await prisma.kPIYear.upsert({
      where: { year },
      update: {},
      create: { year },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create KPI year', { year, error });

    return new NextResponse('Failed to create year', {
      status: 500,
    });
  }
}

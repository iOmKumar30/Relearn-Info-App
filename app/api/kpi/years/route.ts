import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import { canViewKpis } from '@/libs/kpi/auth';
import { parseKpiYear } from '@/libs/kpi/validation';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!(await canViewKpis(session.user.id))) return new NextResponse('Forbidden', { status: 403 });

  const years = await prisma.kPIYear.findMany({
    orderBy: { year: 'desc' },
  });

  const minYear = years.at(-1)?.year;
  const maxYear = years[0]?.year;
  const values = minYear && maxYear
    ? await prisma.kPIMonthlyValue.findMany({
        where: { month: { gte: new Date(Date.UTC(minYear, 0, 1)), lt: new Date(Date.UTC(maxYear + 1, 0, 1)) } },
        select: { month: true },
      })
    : [];
  const monthsByYear = new Map<number, Set<string>>();
  for (const value of values) {
    const year = value.month.getUTCFullYear();
    if (!monthsByYear.has(year)) monthsByYear.set(year, new Set());
    monthsByYear.get(year)!.add(value.month.toISOString().slice(0, 7));
  }
  const rows = years.map((yearRow) => ({
    year: yearRow.year,
    createdAt: yearRow.createdAt.toISOString(),
    monthsWithData: monthsByYear.get(yearRow.year)?.size ?? 0,
  }));

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

  const body: unknown = await req.json().catch(() => null);
  const year = parseKpiYear((body as { year?: unknown } | null)?.year);
  if (year === null) {
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

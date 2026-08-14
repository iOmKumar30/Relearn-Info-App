import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import { firstDayOfMonthFromYYYYMM } from '@/libs/kpi/month';
import { isNonEmptyString, parseFiniteNumber, parseMonthInput } from '@/libs/kpi/validation';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: unknown = await req.json().catch(() => null);
  const input = body as { kpiKey?: unknown; month?: unknown; value?: unknown; notes?: unknown } | null;
  const month = parseMonthInput(input?.month);
  const value = parseFiniteNumber(input?.value);
  const notes = typeof input?.notes === 'string' ? input.notes : input?.notes === null || input?.notes === undefined ? null : undefined;
  if (!input || !isNonEmptyString(input.kpiKey) || !month || value === null || notes === undefined) {
    return NextResponse.json({ error: 'Invalid KPI manual value' }, { status: 400 });
  }

  try {
    const kpi = await prisma.kPI.findUnique({ where: { key: input.kpiKey.trim() } });
    if (!kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    const saved = await prisma.kPIMonthlyValue.upsert({
      where: { kpiId_month_source: { kpiId: kpi.id, month: firstDayOfMonthFromYYYYMM(month), source: 'MANUAL' } },
      update: { value, notes, userId: session.user.id },
      create: { kpiId: kpi.id, month: firstDayOfMonthFromYYYYMM(month), value, source: 'MANUAL', notes, userId: session.user.id },
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('KPI manual upsert failed', error);
    return NextResponse.json({ error: 'Unable to save manual KPI value' }, { status: 500 });
  }
}

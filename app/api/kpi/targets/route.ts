import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import { isNonEmptyString, parseDateInput, parseFiniteNumber } from '@/libs/kpi/validation';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: unknown = await req.json().catch(() => null);
  const input = body as { kpiKey?: unknown; fiscalLabel?: unknown; startDate?: unknown; endDate?: unknown; targetValue?: unknown } | null;
  const startDate = parseDateInput(input?.startDate);
  const endDate = parseDateInput(input?.endDate);
  const targetValue = parseFiniteNumber(input?.targetValue);
  if (!input || !isNonEmptyString(input.kpiKey) || !isNonEmptyString(input.fiscalLabel, 64) || !startDate || !endDate || startDate > endDate || targetValue === null) {
    return NextResponse.json({ error: 'Invalid fiscal target' }, { status: 400 });
  }

  try {
    const kpi = await prisma.kPI.findUnique({ where: { key: input.kpiKey.trim() } });
    if (!kpi) return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    const existing = await prisma.kPIFiscalTarget.findUnique({ where: { kpiId_fiscalLabel: { kpiId: kpi.id, fiscalLabel: input.fiscalLabel.trim() } } });
    const overlap = await prisma.kPIFiscalTarget.findFirst({
      where: { kpiId: kpi.id, ...(existing ? { id: { not: existing.id } } : {}), startDate: { lte: endDate }, endDate: { gte: startDate } },
      select: { id: true },
    });
    if (overlap) return NextResponse.json({ error: 'Target range overlaps an existing fiscal target' }, { status: 409 });

    const saved = await prisma.kPIFiscalTarget.upsert({
      where: { kpiId_fiscalLabel: { kpiId: kpi.id, fiscalLabel: input.fiscalLabel.trim() } },
      update: { startDate, endDate, targetValue },
      create: { kpiId: kpi.id, fiscalLabel: input.fiscalLabel.trim(), startDate, endDate, targetValue },
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('KPI target upsert failed', error);
    return NextResponse.json({ error: 'Unable to save fiscal target' }, { status: 500 });
  }
}

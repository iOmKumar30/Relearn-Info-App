import { authOptions } from '@/libs/authOptions';
import { canViewKpis } from '@/libs/kpi/auth';
import { firstDayOfMonthFromYYYYMM, nextMonthStart } from '@/libs/kpi/month';
import { parseMonthInput } from '@/libs/kpi/validation';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

function csvField(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canViewKpis(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const fromKey = params.get('from');
  const toKey = params.get('to');
  if (!parseMonthInput(fromKey) || !parseMonthInput(toKey) || fromKey > toKey) {
    return NextResponse.json({ error: 'Invalid month range' }, { status: 400 });
  }
  const from = firstDayOfMonthFromYYYYMM(fromKey);
  const toExclusive = nextMonthStart(firstDayOfMonthFromYYYYMM(toKey));
  const monthSpan = (toExclusive.getUTCFullYear() - from.getUTCFullYear()) * 12 + toExclusive.getUTCMonth() - from.getUTCMonth();
  if (monthSpan > 120) return NextResponse.json({ error: 'Month range cannot exceed 120 months' }, { status: 400 });
  const kpis = await prisma.kPI.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  const values = await prisma.kPIMonthlyValue.findMany({ where: { kpiId: { in: kpis.map((k) => k.id) }, month: { gte: from, lt: toExclusive } } });
  const effective = new Map<string, (typeof values)[number]>();
  for (const value of values) {
    const key = `${value.kpiId}:${value.month.toISOString().slice(0, 7)}`;
    const existing = effective.get(key);
    if (!existing || value.source === 'MANUAL') effective.set(key, value);
  }
  const lines = ['month,kpi_key,kpi_label,unit,value,source'];
  for (const value of [...effective.values()].sort((a, b) => a.month.getTime() - b.month.getTime() || a.kpiId.localeCompare(b.kpiId))) {
    const kpi = kpis.find((item) => item.id === value.kpiId);
    if (kpi) lines.push([value.month.toISOString().slice(0, 7), kpi.key, kpi.label, kpi.unit, value.value, value.source].map(csvField).join(','));
  }
  return new NextResponse(lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kpi-${fromKey}-to-${toKey}.csv"` } });
}

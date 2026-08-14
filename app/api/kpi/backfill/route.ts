import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import { runKpiBackfillMonth } from '@/libs/kpi/backfill';
import { currentMonthYYYYMM } from '@/libs/kpi/month';
import { parseKpiMonthRange } from '@/libs/kpi/validation';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

const MAX_BACKFILL_MONTHS = 12;

function hasFinancialYearOverlap(rows: Array<{ startDate: Date; endDate: Date }>) {
  const ordered = [...rows].sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  let latestEnd: Date | null = null;
  for (const row of ordered) {
    if (latestEnd && row.startDate <= latestEnd) return true;
    if (!latestEnd || row.endDate > latestEnd) latestEnd = row.endDate;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid backfill request' }, { status: 400 });
  }
  const input = body as { startMonth?: unknown; endMonth?: unknown; dryRun?: unknown; includeProjects?: unknown };
  if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') {
    return NextResponse.json({ error: 'dryRun must be a boolean' }, { status: 400 });
  }
  if (input.includeProjects !== undefined && typeof input.includeProjects !== 'boolean') {
    return NextResponse.json({ error: 'includeProjects must be a boolean' }, { status: 400 });
  }
  if (input.includeProjects === true) {
    return NextResponse.json({ error: 'Historical project KPI recomputation is unsupported' }, { status: 400 });
  }

  const range = parseKpiMonthRange(
    input.startMonth,
    input.endMonth,
    currentMonthYYYYMM(),
    MAX_BACKFILL_MONTHS,
  );
  if ('error' in range) return NextResponse.json({ error: range.error }, { status: 400 });
  const dryRun = input.dryRun === true;

  try {
    const financialYears = await prisma.financialYear.findMany({
      select: { startDate: true, endDate: true },
      orderBy: { startDate: 'asc' },
    });
    if (hasFinancialYearOverlap(financialYears)) {
      return NextResponse.json({ error: 'Financial year overlap must be resolved before KPI backfill' }, { status: 409 });
    }

    const results = [];
    // Intentionally sequential: each month has its own atomic queue claim and a
    // failed month is reported while later independent months are still attempted.
    for (const targetMonth of range.months) {
      try {
        results.push(await runKpiBackfillMonth({ targetMonth, actorId: session.user.id, dryRun }));
      } catch (error) {
        console.error('[KPI_BACKFILL] Month failed before completion', { actorId: session.user.id, targetMonth, error: String(error) });
        results.push({ month: targetMonth, status: 'failed' as const, autoKpisWritten: [], skippedKpis: [], failedKpis: ['month'] });
      }
    }

    return NextResponse.json({
      success: results.every((result) => result.status !== 'failed'),
      dryRun,
      currentBusinessMonth: currentMonthYYYYMM(),
      results,
    });
  } catch (error) {
    console.error('[KPI_BACKFILL] Request failed', { actorId: session.user.id, error: String(error) });
    return NextResponse.json({ error: 'Unable to run KPI backfill' }, { status: 500 });
  }
}

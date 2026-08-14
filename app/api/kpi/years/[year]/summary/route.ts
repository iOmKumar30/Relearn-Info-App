import { authOptions } from '@/libs/authOptions';
import { canViewKpis } from '@/libs/kpi/auth';
import { historicalKpiSkipReason } from '@/libs/kpi/backfill';
import { currentMonthYYYYMM } from '@/libs/kpi/month';
import { parseKpiYear } from '@/libs/kpi/validation';
import { getYearSummaryWindow, resolveEffectiveMonthlyValues } from '@/libs/kpi/yearSummary';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// Finance KPIs use a fiscal year that spans two calendar years.
// Year 2026 → FY2026-27 → Apr 2026 to Mar 2027
// So for finance summary on the year page, we use the fiscal window.
const FINANCE_KPI_KEYS = [
  'finance.revenue.current.lakhs',
  'finance.expenditure.current.lakhs',
  'finance.revenue.past.lakhs',
  'finance.expenditure.past.lakhs',
];

const MONTHLY_FINANCE_KPI_KEYS = new Set([
  'finance.revenue.monthly.lakhs',
  'finance.expenditure.monthly.lakhs',
]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse('Unauthorized', { status: 401 });
  if (!(await canViewKpis(session.user.id))) return new NextResponse('Forbidden', { status: 403 });

  const { year } = await ctx.params;
  const yearNum = parseKpiYear(year);
  if (yearNum === null) return new NextResponse('Invalid year', { status: 400 });
  if (!(await prisma.kPIYear.findUnique({ where: { year: yearNum }, select: { id: true } }))) {
    return new NextResponse('KPI year not found', { status: 404 });
  }

  const currentBusinessMonth = currentMonthYYYYMM();
  const window = getYearSummaryWindow(yearNum, currentBusinessMonth);
  const fiscalLabel = `FY${yearNum}-${String(yearNum + 1).slice(-2)}`;

  const kpis = (await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })).filter((kpi) => !MONTHLY_FINANCE_KPI_KEYS.has(kpi.key));
  const activeKpiIds = kpis.map((kpi) => kpi.id);

  // Fetch all monthly values for calendar year (for non-finance KPIs)
  const calValues = await prisma.kPIMonthlyValue.findMany({
    where: {
      kpiId: { in: activeKpiIds },
      month: {
        gte: window.calendarFrom,
        lt: window.calendarToExclusive,
      },
    },
    orderBy: {
      month: 'asc',
    },
  });

  // Fetch all monthly values for fiscal year (for finance KPIs)
  const fiscalValues = await prisma.kPIMonthlyValue.findMany({
    where: {
      kpiId: { in: activeKpiIds },
      month: {
        gte: window.fiscalFrom,
        lt: window.fiscalToExclusive,
      },
    },
    orderBy: {
      month: 'asc',
    },
  });

  // Count distinct months with data in calendar year
  const monthsWithData = new Set(
    calValues.map((v) => v.month.toISOString().slice(0, 7)),
  ).size;
  const currentKpiYear = Number(currentBusinessMonth.slice(0, 4));
  const isFullYear = yearNum < currentKpiYear && monthsWithData === 12;
  const isHistoricalYear = yearNum <= currentKpiYear;

  const summaryKpis = kpis.map((k) => {
    const isFinance = FINANCE_KPI_KEYS.includes(k.key);
    const pool = isFinance ? fiscalValues : calValues;

    const relevant = pool.filter((v) => v.kpiId === k.id);

    // MANUAL overrides AUTO per month after the completed-month cutoff.
    const monthlyValues = resolveEffectiveMonthlyValues(relevant);

    const values = monthlyValues.map((entry) => entry.value);
    const hasData = monthlyValues.length > 0;

    let aggregatedValue: number | null = null;

    if (hasData) {
      const latestValue = monthlyValues[monthlyValues.length - 1].value;

      if (isFinance) {
        // Finance values are cumulative within a fiscal year.
        // Use the last available fiscal-month snapshot.
        aggregatedValue = latestValue;
      } else if (k.unit === 'PERCENT') {
        // A rate can be summarized as the average of available months.
        aggregatedValue =
          values.reduce((sum, value) => sum + value, 0) / values.length;
      } else {
        // Snapshot/count KPIs use their latest available monthly value.
        aggregatedValue = latestValue;
      }
    }

    // Fetch active fiscal target for this KPI in this year
    return {
      id: k.id,
      key: k.key,
      label: k.label,
      unit: k.unit,
      category: k.category,
      sortOrder: k.sortOrder,
      aggregatedValue,
      monthsCovered: values.length,
      latestAvailableMonth: monthlyValues.at(-1)?.monthKey ?? null,
      fiscalLabel: isFinance ? fiscalLabel : null,
      historicalAvailability: aggregatedValue === null && isHistoricalYear && historicalKpiSkipReason(k.key)
        ? k.key === 'entrepreneurs.created'
          ? 'MANUAL_ENTRY_REQUIRED'
          : 'HISTORICAL_DATA_UNAVAILABLE'
        : null,
    };
  });

  return NextResponse.json({
    year: yearNum,
    monthsWithData,
    isFullYear,
    fiscalLabel,
    isCurrentYear: window.isCurrentYear,
    latestCompletedMonth: window.latestCompletedMonth?.toISOString() ?? null,
    kpis: summaryKpis,
  });
}

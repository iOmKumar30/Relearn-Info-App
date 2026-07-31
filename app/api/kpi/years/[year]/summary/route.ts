import { authOptions } from '@/libs/authOptions';
import { firstDayOfMonthFromYYYYMM } from '@/libs/kpi/month';
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

function getFiscalRange(calendarYear: number) {
  // Fiscal year starts April 1 of calendarYear, ends March 31 of calendarYear+1
  return {
    from: new Date(calendarYear, 3, 1), // Apr 1
    to: new Date(calendarYear + 1, 2, 31), // Mar 31 next year
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ year: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse('Unauthorized', { status: 401 });

  const { year } = await ctx.params;
  const yearNum = Number(year);

  const calFrom = new Date(yearNum, 0, 1);
  const calToExclusive = new Date(yearNum + 1, 0, 1);

  const fiscal = {
    from: new Date(yearNum, 3, 1),
    toExclusive: new Date(yearNum + 1, 3, 1),
  };
  const fiscalLabel = `FY${yearNum}-${String(yearNum + 1).slice(-2)}`;

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });

  // Fetch all monthly values for calendar year (for non-finance KPIs)
  const calValues = await prisma.kPIMonthlyValue.findMany({
    where: {
      month: {
        gte: calFrom,
        lt: new Date(yearNum + 1, 0, 1),
      },
    },
    orderBy: {
      month: 'asc',
    },
  });

  // Fetch all monthly values for fiscal year (for finance KPIs)
  const fiscalValues = await prisma.kPIMonthlyValue.findMany({
    where: {
      month: {
        gte: fiscal.from,
        lt: new Date(yearNum + 1, 3, 1),
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
  const isFullYear =
    yearNum < new Date().getFullYear() && monthsWithData === 12;

  const summaryKpis = kpis.map((k) => {
    const isFinance = FINANCE_KPI_KEYS.includes(k.key);
    const pool = isFinance ? fiscalValues : calValues;

    const relevant = pool.filter((v) => v.kpiId === k.id);

    // Deduplicate: MANUAL overrides AUTO per month
    const byMonth = new Map<string, number>();
    // First pass: AUTO
    for (const v of relevant) {
      if (v.source === 'AUTO') {
        byMonth.set(v.month.toISOString().slice(0, 7), v.value);
      }
    }
    // Second pass: MANUAL overrides
    for (const v of relevant) {
      if (v.source === 'MANUAL') {
        byMonth.set(v.month.toISOString().slice(0, 7), v.value);
      }
    }

    const monthlyValues = Array.from(byMonth.entries())
      .map(([monthKey, value]) => ({
        monthKey,
        value,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

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
      fiscalLabel: isFinance ? fiscalLabel : null,
    };
  });

  return NextResponse.json({
    year: yearNum,
    monthsWithData,
    isFullYear,
    fiscalLabel,
    kpis: summaryKpis,
  });
}

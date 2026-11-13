import { authOptions } from '@/libs/authOptions';
import { canViewKpis } from '@/libs/kpi/auth';
import { currentMonthYYYYMM, firstDayOfMonthFromYYYYMM, nextMonthStart } from '@/libs/kpi/month';
import { getKpiReportMonths, KPI_REPORT_ROWS, type KpiReport } from '@/libs/kpi/report';
import { createKpiReportWorkbook } from '@/libs/kpi/report-workbook';
import { parseKpiYear } from '@/libs/kpi/validation';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });
  if (!(await canViewKpis(session.user.id))) return new NextResponse('Forbidden', { status: 403 });

  const params = new URL(req.url).searchParams;
  const year = parseKpiYear(params.get('year'));
  const rawMonth = params.get('month');
  const month = rawMonth === null ? undefined : Number(rawMonth);
  if (year === null || (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12))) {
    return new NextResponse('Invalid year or month', { status: 400 });
  }
  const months = getKpiReportMonths(year, month);
  if (!months.length) return new NextResponse('No completed months are available for this year.', { status: 400 });

  try {
    if (!(await prisma.kPIYear.findUnique({ where: { year }, select: { id: true } }))) {
      return new NextResponse('KPI year not found', { status: 404 });
    }
    const from = firstDayOfMonthFromYYYYMM(months[0]);
    const lastMonth = firstDayOfMonthFromYYYYMM(months[months.length - 1]);
    // The year report has one annual target column. A monthly report uses the
    // fiscal year containing its selected month (April through March).
    const fiscalYear = month !== undefined && month < 4 ? year - 1 : year;
    const fiscalFrom = new Date(Date.UTC(fiscalYear, 3, 1));
    const fiscalTo = new Date(Date.UTC(fiscalYear + 1, 3, 1));
    const keys = KPI_REPORT_ROWS.flatMap((row) => 'targetKey' in row ? [row.key, row.targetKey] : [row.key]);
    const kpis = await prisma.kPI.findMany({ where: { active: true, key: { in: keys } } });
    const ids = kpis.map((kpi) => kpi.id);
    const [values, targets, projects] = await Promise.all([
      prisma.kPIMonthlyValue.findMany({ where: { kpiId: { in: ids }, month: { gte: from, lt: nextMonthStart(lastMonth) } } }),
      prisma.kPIFiscalTarget.findMany({
        where: { kpiId: { in: ids }, startDate: { gte: fiscalFrom, lt: fiscalTo } },
        orderBy: { startDate: 'desc' },
      }),
      prisma.project.count({ where: {
        status: { in: ['ONGOING', 'COMPLETED'] },
        year: { contains: currentMonthYYYYMM().slice(0, 4) },
      } }),
    ]);
    const effective = new Map<string, (typeof values)[number]>();
    for (const value of values) {
      const key = `${value.kpiId}:${value.month.toISOString().slice(0, 7)}`;
      if (!effective.has(key) || value.source === 'MANUAL') effective.set(key, value);
    }
    const report: KpiReport = {
      months,
      fiscalLabel: `${fiscalYear}-${String(fiscalYear + 1).slice(-2)}`,
      rows: KPI_REPORT_ROWS.map((row) => {
        const kpi = kpis.find((item) => item.key === row.key);
        const targetKpi = 'targetKey' in row ? kpis.find((item) => item.key === row.targetKey) : undefined;
        const target = targets.find((item) => item.kpiId === kpi?.id)
          ?? targets.find((item) => targetKpi && item.kpiId === targetKpi.id);
        return {
          label: row.label,
          unit: kpi?.unit ?? (row.key === 'classrooms.senior.share' ? 'PERCENT' : row.key.startsWith('finance.') ? 'LAKHS' : 'COUNT'),
          target: target?.targetValue ?? null,
          values: months.map((key) => {
            const value = kpi ? effective.get(`${kpi.id}:${key}`) : undefined;
            // The requested report defines this row as ongoing + completed
            // projects whose year string contains the current calendar year.
            if (row.key === 'projects.ongoing') return projects;
            return value?.value ?? null;
          }),
        };
      }),
    };
    const workbook = createKpiReportWorkbook(report, month === undefined ? 'YTD KPIs' : 'Monthly KPIs');
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = month === undefined ? `KPI_YTD_${year}` : `KPI_${months[0]}`;
    return new NextResponse(new Uint8Array(buffer), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      'Cache-Control': 'private, no-store',
    } });
  } catch (error) {
    console.error('KPI report export failed', error);
    return new NextResponse('Unable to export KPI report. Please try again.', { status: 500 });
  }
}

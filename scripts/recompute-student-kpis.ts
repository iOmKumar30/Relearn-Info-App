import 'dotenv/config';

import { isAdmin } from '../libs/isAdmin';
import {
  computeStudentsPassedX,
  computeStudentsTotal,
  upsertAuto,
} from '../libs/kpi/compute';
import { currentMonthYYYYMM, firstDayOfMonthFromYYYYMM } from '../libs/kpi/month';
import { parseKpiMonthRange } from '../libs/kpi/validation';
import prisma from '../libs/prismadb';

const KPI_KEYS = ['students.total', 'students.passed.x'] as const;

function parseArgs(args: string[]) {
  const startIndex = args.indexOf('--start-month');
  const endIndex = args.indexOf('--end-month');
  const actorIndex = args.indexOf('--actor-id');
  return {
    startMonth: startIndex >= 0 ? args[startIndex + 1] : undefined,
    endMonth: endIndex >= 0 ? args[endIndex + 1] : undefined,
    actorId: actorIndex >= 0 ? args[actorIndex + 1] : undefined,
    dryRun: args.includes('--dry-run'),
  };
}

type MonthResult = {
  month: string;
  studentsTotal: number | null;
  studentsTotalAction: 'create' | 'update' | null;
  studentsPassedX: number | null;
  studentsPassedXAction: 'create' | 'update' | null;
  status: 'dry-run' | 'success' | 'failed';
};

async function main() {
  const { startMonth, endMonth, actorId, dryRun } = parseArgs(process.argv.slice(2));
  if (!actorId || !(await isAdmin(actorId))) {
    throw new Error('An active ADMIN actor ID is required');
  }

  const range = parseKpiMonthRange(startMonth, endMonth, currentMonthYYYYMM(), 12);
  if ('error' in range) throw new Error(range.error);

  const definitions = await prisma.kPI.findMany({
    where: { key: { in: [...KPI_KEYS] }, active: true },
    select: { id: true, key: true },
  });
  const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));
  if (definitionsByKey.size !== KPI_KEYS.length) {
    throw new Error('Required active student KPI definitions are unavailable');
  }

  const results: MonthResult[] = [];
  for (const month of range.months) {
    const monthDate = firstDayOfMonthFromYYYYMM(month);
    try {
      const studentsTotal = await computeStudentsTotal(monthDate);
      const studentsPassedX = await computeStudentsPassedX(monthDate);
      if (!Number.isFinite(studentsTotal) || !Number.isFinite(studentsPassedX)) {
        throw new Error('Computed student KPI value is invalid');
      }

      // Query only AUTO rows to report create/update. MANUAL rows are neither
      // queried nor selected for mutation by this maintenance command.
      const [totalAuto, passedAuto] = await Promise.all([
        prisma.kPIMonthlyValue.findUnique({
          where: {
            kpiId_month_source: {
              kpiId: definitionsByKey.get('students.total')!.id,
              month: monthDate,
              source: 'AUTO',
            },
          },
          select: { id: true },
        }),
        prisma.kPIMonthlyValue.findUnique({
          where: {
            kpiId_month_source: {
              kpiId: definitionsByKey.get('students.passed.x')!.id,
              month: monthDate,
              source: 'AUTO',
            },
          },
          select: { id: true },
        }),
      ]);
      const studentsTotalAction = totalAuto ? 'update' as const : 'create' as const;
      const studentsPassedXAction = passedAuto ? 'update' as const : 'create' as const;

      if (!dryRun) {
        await upsertAuto(definitionsByKey.get('students.total')!.id, monthDate, studentsTotal);
        await upsertAuto(definitionsByKey.get('students.passed.x')!.id, monthDate, studentsPassedX);
      }

      results.push({
        month,
        studentsTotal,
        studentsTotalAction,
        studentsPassedX,
        studentsPassedXAction,
        status: dryRun ? 'dry-run' : 'success',
      });
      console.info('[KPI_STUDENT_RECOMPUTE]', {
        actorId,
        month,
        dryRun,
        studentsTotal,
        studentsTotalAction,
        studentsPassedX,
        studentsPassedXAction,
      });
    } catch {
      console.error('[KPI_STUDENT_RECOMPUTE] Month failed', {
        actorId,
        month,
      });
      results.push({
        month,
        studentsTotal: null,
        studentsTotalAction: null,
        studentsPassedX: null,
        studentsPassedXAction: null,
        status: 'failed',
      });
    }
  }

  console.table(results);
  if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
}

main().catch(() => {
  console.error('Student KPI recompute failed');
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());

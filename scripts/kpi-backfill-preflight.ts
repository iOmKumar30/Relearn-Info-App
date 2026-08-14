import 'dotenv/config';

import prisma from '../libs/prismadb';

async function main() {
  const [financialYears, incompleteInternCount, fiscalTargets, boardResultCount, entrepreneurDefinition, adminActors, coverage, queue] = await Promise.all([
    prisma.financialYear.findMany({ select: { startDate: true, endDate: true }, orderBy: { startDate: 'asc' } }),
    prisma.intern.count({ where: { status: { in: ['COMPLETED', 'DROPPED'] }, completionDate: null } }),
    prisma.kPIFiscalTarget.findMany({ select: { kpiId: true, startDate: true, endDate: true }, orderBy: [{ kpiId: 'asc' }, { startDate: 'asc' }] }),
    prisma.boardExamResult.count(),
    prisma.kPI.findUnique({ where: { key: 'entrepreneurs.created' }, select: { key: true, label: true, description: true, category: true, createdAt: true } }),
    prisma.user.findMany({ where: { roleHistory: { some: { endDate: null, role: { name: 'ADMIN' } } } }, select: { id: true } }),
    prisma.kPIMonthlyValue.groupBy({
      by: ['month'],
      where: { month: { gte: new Date('2026-01-01T00:00:00.000Z'), lt: new Date('2026-09-01T00:00:00.000Z') } },
      _count: { id: true },
      orderBy: { month: 'asc' },
    }),
    prisma.kpiJobQueue.findMany({
      where: { targetMonth: { gte: '2026-01', lte: '2026-08' } },
      select: { targetMonth: true, status: true, attempts: true, updatedAt: true, lastError: true },
      orderBy: { targetMonth: 'asc' },
    }),
  ]);

  let latestEnd: Date | null = null;
  let financialYearOverlapCount = 0;
  for (const year of financialYears) {
    if (latestEnd && year.startDate <= latestEnd) financialYearOverlapCount += 1;
    if (!latestEnd || year.endDate > latestEnd) latestEnd = year.endDate;
  }
  const latestTargetEndByKpi = new Map<string, Date>();
  let fiscalTargetOverlapCount = 0;
  for (const target of fiscalTargets) {
    const latestEndForKpi = latestTargetEndByKpi.get(target.kpiId);
    if (latestEndForKpi && target.startDate <= latestEndForKpi) fiscalTargetOverlapCount += 1;
    if (!latestEndForKpi || target.endDate > latestEndForKpi) latestTargetEndByKpi.set(target.kpiId, target.endDate);
  }
  console.log(JSON.stringify({
    safeToBackfill: financialYearOverlapCount === 0,
    financialYearOverlapCount,
    fiscalTargetOverlapCount,
    incompleteInternCount,
    boardResultCount,
    entrepreneurDefinition,
    adminActorIds: adminActors.map((actor) => actor.id),
    coverage: coverage.map((row) => ({ month: row.month.toISOString().slice(0, 7), rows: row._count.id })),
    queue,
  }));
}

main().catch((error) => {
  console.error('KPI backfill preflight failed', error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());

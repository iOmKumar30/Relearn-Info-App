import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import prisma from '@/libs/prismadb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

type DatedRange = {
  id: string;
  startDate: Date;
  endDate: Date;
};

function findOverlaps<T extends DatedRange>(ranges: T[]): Array<{ left: T; right: T }> {
  const ordered = [...ranges].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const overlaps: Array<{ left: T; right: T }> = [];

  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const left = ordered[leftIndex];
      const right = ordered[rightIndex];
      if (right.startDate > left.endDate) break;
      overlaps.push({ left, right });
    }
  }

  return overlaps;
}

/**
 * Admin-only operational audit. It reports data conditions that can make
 * historical KPI recomputation ambiguous; it never alters source data.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [financialYears, fiscalTargets, incompleteInternCount, incompleteInterns, boardResultCount] = await Promise.all([
      prisma.financialYear.findMany({
        select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
        orderBy: { startDate: 'asc' },
      }),
      prisma.kPIFiscalTarget.findMany({
        select: {
          id: true,
          kpiId: true,
          fiscalLabel: true,
          startDate: true,
          endDate: true,
          kpi: { select: { key: true, label: true } },
        },
        orderBy: [{ kpiId: 'asc' }, { startDate: 'asc' }],
      }),
      prisma.intern.count({
        where: { status: { in: ['COMPLETED', 'DROPPED'] }, completionDate: null },
      }),
      prisma.intern.findMany({
        where: { status: { in: ['COMPLETED', 'DROPPED'] }, completionDate: null },
        select: { id: true, name: true, status: true, joiningDate: true },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      prisma.legacyBoardResult.count(),
    ]);

    const financialYearOverlaps = findOverlaps(financialYears).map(({ left, right }) => ({
      left: { id: left.id, name: left.name, startDate: left.startDate, endDate: left.endDate, isActive: left.isActive },
      right: { id: right.id, name: right.name, startDate: right.startDate, endDate: right.endDate, isActive: right.isActive },
    }));

    const targetsByKpi = new Map<string, typeof fiscalTargets>();
    for (const target of fiscalTargets) {
      const targets = targetsByKpi.get(target.kpiId) ?? [];
      targets.push(target);
      targetsByKpi.set(target.kpiId, targets);
    }
    const fiscalTargetOverlaps = Array.from(targetsByKpi.values()).flatMap((targets) =>
      findOverlaps(targets).map(({ left, right }) => ({
        kpi: left.kpi,
        left: { id: left.id, fiscalLabel: left.fiscalLabel, startDate: left.startDate, endDate: left.endDate },
        right: { id: right.id, fiscalLabel: right.fiscalLabel, startDate: right.startDate, endDate: right.endDate },
      })),
    );
    const blockingIssues = financialYearOverlaps.length > 0
      ? ['Overlapping FinancialYear intervals make finance KPI backfill ambiguous. Resolve them before backfill.']
      : [];
    const warnings = [
      ...(fiscalTargetOverlaps.length > 0
        ? ['Overlapping fiscal targets were found. They do not change AUTO calculations, but target interpretation is ambiguous.']
        : []),
      ...(incompleteInternCount > 0
        ? [`${incompleteInternCount} completed or dropped interns have no completionDate; intern KPI history may be overstated.`]
        : []),
      'students.passed.x uses all legacy board-result records whose passingYear equals the KPI snapshot year.',
      'Historical project AUTO snapshots are intentionally excluded because project lifecycle history is unavailable.',
      'entrepreneurs.created has no approved historical compute handler and is excluded from historical AUTO backfill.',
    ];

    return NextResponse.json({
      financialYearOverlaps,
      fiscalTargetOverlaps,
      internsMissingCompletionDate: {
        count: incompleteInternCount,
        sample: incompleteInterns,
      },
      historicalKpiWarnings: {
        projects: 'Historical project recomputation is approximate because status is mutable and lifecycle event history is unavailable. Historical project AUTO snapshots are preserved.',
        interns: 'Completed or dropped interns without completionDate are counted as historically active after their joining date until the data is corrected.',
        boardResults: `students.passed.x uses legacy board-result records by passingYear. ${boardResultCount} legacy result records are currently stored.`,
        entrepreneursCreated: 'entrepreneurs.created has no approved historical compute handler and is excluded from historical AUTO backfill.',
      },
      backfillReadiness: {
        safeToBackfill: blockingIssues.length === 0,
        blockingIssues,
        warnings,
      },
    });
  } catch (error) {
    console.error('KPI audit failed', error);
    return NextResponse.json({ error: 'Unable to run KPI audit' }, { status: 500 });
  }
}

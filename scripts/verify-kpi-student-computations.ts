import assert from 'node:assert/strict';
import 'dotenv/config';

import { computeStudentsPassedX, computeStudentsTotal, upsertAuto } from '../libs/kpi/compute';

async function main() {
  const attendanceCalls: Array<{ where: { year: number; month: number } }> = [];
  const augustAttendance = [10, 15, null];
  const reportedEnrollment = await computeStudentsTotal(
    new Date('2026-08-19T12:00:00.000Z'),
    {
      monthlyClassroomAttendance: {
        // Simulates database _sum for submitted classroom rows 10, 15, and null.
        aggregate: async (args) => {
          attendanceCalls.push(args);
          return {
            _sum: {
              totalStudentsEnrolled: augustAttendance.reduce<number>(
                (sum, enrolled) => sum + (enrolled ?? 0),
                0,
              ),
            },
          };
        },
      },
    },
  );
  assert.equal(reportedEnrollment, 25);
  assert.deepEqual(attendanceCalls, [{ where: { year: 2026, month: 8 }, _sum: { totalStudentsEnrolled: true } }]);

  const noAttendance = await computeStudentsTotal(
    new Date('2026-09-01T00:00:00.000Z'),
    { monthlyClassroomAttendance: { aggregate: async () => ({ _sum: { totalStudentsEnrolled: null } }) } },
  );
  assert.equal(noAttendance, 0, 'no attendance rows must produce zero without a fallback');

  const passingYearCalls: Array<{ where: { passingYear: number } }> = [];
  const legacyRows = [
    { passingYear: 2026 },
    { passingYear: 2026 },
    { passingYear: 2026 },
    { passingYear: 2025 },
    { passingYear: 2025 },
  ];
  const legacyResults = {
    legacyBoardResult: {
      count: async (args: { where: { passingYear: number } }) => {
        passingYearCalls.push(args);
        return legacyRows.filter((row) => row.passingYear === args.where.passingYear).length;
      },
    },
  };
  // The three 2026 rows count for every 2026 snapshot and not for 2025; the
  // two 2025 rows count for 2025 and not for 2026. The count mock receives no
  // date, Student, BoardExamResult, or relation filters.
  assert.equal(await computeStudentsPassedX(new Date('2026-01-01T00:00:00.000Z'), legacyResults), 3);
  assert.equal(await computeStudentsPassedX(new Date('2026-08-01T00:00:00.000Z'), legacyResults), 3);
  assert.equal(await computeStudentsPassedX(new Date('2025-02-01T00:00:00.000Z'), legacyResults), 2);
  assert.equal(await computeStudentsPassedX(new Date('2024-02-01T00:00:00.000Z'), legacyResults), 0);
  assert.deepEqual(passingYearCalls, [
    { where: { passingYear: 2026 } },
    { where: { passingYear: 2026 } },
    { where: { passingYear: 2025 } },
    { where: { passingYear: 2024 } },
  ]);

  // The existing AUTO writer remains source-isolated: it uses the composite
  // (kpiId, month, source) key, so MANUAL rows are not selected or updated.
  assert.match(upsertAuto.toString(), /kpiId_month_source/);
  console.log('KPI student computation verification passed. No database writes were performed.');
}

main().catch((error) => {
  console.error('KPI student computation verification failed', error);
  process.exitCode = 1;
});

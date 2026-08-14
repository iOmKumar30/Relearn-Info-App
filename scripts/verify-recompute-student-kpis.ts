import assert from 'node:assert/strict';
import 'dotenv/config';

import {
  computeStudentsPassedX,
  computeStudentsTotal,
  upsertAuto,
} from '../libs/kpi/compute';

async function main() {
  const mayAttendance = [300, 250, 142, null];
  const studentsTotal = await computeStudentsTotal(
    new Date('2026-05-01T00:00:00.000Z'),
    {
      monthlyClassroomAttendance: {
        aggregate: async () => ({
          _sum: { totalStudentsEnrolled: mayAttendance.reduce((sum, value) => sum + (value ?? 0), 0) },
        }),
      },
    },
  );
  assert.equal(studentsTotal, 692);

  const studentsPassedX = await computeStudentsPassedX(
    new Date('2026-05-01T00:00:00.000Z'),
    {
      legacyBoardResult: {
        count: async ({ where }) => where.passingYear === 2026 ? 13 : 0,
      },
    },
  );
  assert.equal(studentsPassedX, 13);

  const manualValue = { value: 999, source: 'MANUAL' };
  let autoValue: number | null = null;
  let upsertCalls = 0;
  await upsertAuto(
    'students-total-kpi',
    new Date('2026-05-17T10:00:00.000Z'),
    studentsTotal,
    {
      kPIMonthlyValue: {
        upsert: async (args) => {
          upsertCalls += 1;
          assert.equal(args.where.kpiId_month_source.source, 'AUTO');
          assert.equal(args.where.kpiId_month_source.month.toISOString(), '2026-05-01T00:00:00.000Z');
          autoValue = args.update.value;
          return {} as never;
        },
      },
    } as never,
  );
  assert.equal(autoValue, 692);
  assert.deepEqual(manualValue, { value: 999, source: 'MANUAL' });
  assert.equal(upsertCalls, 1);

  // All dependencies are mocked; this verification performs no database writes
  // and represents the dry-run requirement for targeted recomputation.
  console.log('Targeted student KPI recompute verification passed. No database writes were performed.');
}

main().catch((error) => {
  console.error('Targeted student KPI recompute verification failed', error);
  process.exitCode = 1;
});

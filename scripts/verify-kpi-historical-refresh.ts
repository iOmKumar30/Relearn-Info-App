import assert from 'node:assert/strict';
import 'dotenv/config';

import { isBackfillKpiEligible } from '../libs/kpi/backfill';
import {
  centreMonthFilter,
  classroomWindowFilter,
  computeHistoricalMembersTotal,
  computeHistoricalPersonsTrained,
  computeHistoricalTutorsTotal,
  computeMonthlyFinances,
  computeStudentsTotal,
  historicalMembersMonthFilter,
  historicalPersonsTrainedMonthFilter,
  historicalTutorsMonthFilter,
  upsertAuto,
} from '../libs/kpi/compute';
import { parseKpiMonthRange } from '../libs/kpi/validation';

async function main() {
  const august = new Date('2026-08-19T12:00:00.000Z');
  const start = new Date('2026-08-01T00:00:00.000Z');
  const next = new Date('2026-09-01T00:00:00.000Z');

  assert.deepEqual(classroomWindowFilter(august), {
    AND: [
      { OR: [{ dateCreated: { lt: next } }, { dateCreated: null, createdAt: { lt: next } }] },
      { OR: [{ dateClosed: null }, { dateClosed: { gte: start } }] },
    ],
  });
  assert.deepEqual(centreMonthFilter(august), {
    dateAssociated: { lt: next },
    OR: [{ dateLeft: null }, { dateLeft: { gte: start } }],
  });

  const tutors = historicalTutorsMonthFilter(august);
  assert.equal('status' in tutors, false, 'today’s user status must not filter historical tutors');
  assert.deepEqual(tutors.roleHistory?.some?.startDate, { lt: next });
  assert.deepEqual(tutors.tutorAssignments?.some?.startDate, { lt: next });
  assert.equal(await computeHistoricalTutorsTotal(august, {
    user: { count: async ({ where }) => { assert.deepEqual(where, tutors); return 2; } },
  }), 2);
  const members = historicalMembersMonthFilter(august);
  assert.equal('status' in members, false, 'today’s member status must not filter historical members');
  assert.deepEqual(members.joiningDate, { lt: next });
  assert.deepEqual(members.typeHistory?.some?.startDate, { lt: next });
  assert.equal(await computeHistoricalMembersTotal(august, {
    member: { count: async ({ where }) => { assert.deepEqual(where, members); return 3; } },
  }), 3);

  const internFilter = historicalPersonsTrainedMonthFilter(august);
  assert.deepEqual(internFilter, {
    joiningDate: { lt: next },
    OR: [{ completionDate: null }, { completionDate: { gte: start } }],
  });
  await computeHistoricalPersonsTrained(august, {
    intern: { count: async ({ where }) => { assert.deepEqual(where, internFilter); return 1; } },
  });

  await computeStudentsTotal(august, {
    monthlyClassroomAttendance: {
      aggregate: async ({ where }) => {
        assert.deepEqual(where, { year: 2026, month: 8 });
        return { _sum: { totalStudentsEnrolled: 25 } };
      },
    },
  });
  await computeMonthlyFinances(august, {
    transaction: {
      aggregate: async ({ where }) => {
        assert.deepEqual(where.statement, { year: 2026, month: 8 });
        return { _sum: { amount: 0 } };
      },
    },
  });

  assert.equal(isBackfillKpiEligible('projects.ongoing', true), false);
  assert.equal(isBackfillKpiEligible('projects.past', true), false);
  assert.equal(isBackfillKpiEligible('entrepreneurs.created', true), false);
  assert.equal(isBackfillKpiEligible('classrooms.senior.share', true), false);
  assert.equal(isBackfillKpiEligible('students.total', true), true);
  assert.deepEqual(parseKpiMonthRange('2026-08', '2026-08', '2026-10'), { months: ['2026-08'] });
  assert.ok('error' in parseKpiMonthRange('2026-11', '2026-11', '2026-10'));

  const manualValue = { value: 42, source: 'MANUAL' };
  await upsertAuto('test-kpi', august, 25, {
    kPIMonthlyValue: {
      upsert: async (args) => {
        assert.equal(args.where.kpiId_month_source.source, 'AUTO');
        assert.equal(args.where.kpiId_month_source.month.toISOString(), start.toISOString());
        assert.equal(args.create.source, 'AUTO');
        return {} as never;
      },
    },
  } as never);
  assert.deepEqual(manualValue, { value: 42, source: 'MANUAL' });
  console.log('Historical KPI refresh checks passed; no database writes were performed.');
}

main().catch((error) => {
  console.error('Historical KPI refresh checks failed', error);
  process.exitCode = 1;
});

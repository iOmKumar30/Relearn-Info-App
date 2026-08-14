import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import 'dotenv/config';

import {
  computePersonsTrained,
  personsTrainedMonthFilter,
} from '../libs/kpi/compute';

async function main() {
  const august = new Date('2026-08-19T12:00:00.000Z');
  const expectedFilter: Prisma.InternWhereInput = {
    joiningDate: { lt: new Date('2026-09-01T00:00:00.000Z') },
    OR: [
      { status: 'ACTIVE' },
      { completionDate: null },
      {
        completionDate: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lt: new Date('2026-09-01T00:00:00.000Z'),
        },
      },
    ],
  };
  assert.deepEqual(personsTrainedMonthFilter(august), expectedFilter);

  let countArgs: { where: Prisma.InternWhereInput } | null = null;
  const count = await computePersonsTrained(august, {
    intern: {
      count: async (args) => {
        countArgs = args;
        return 4;
      },
    },
  });
  assert.equal(count, 4);
  assert.deepEqual(countArgs, { where: expectedFilter });

  console.log('KPI intern computation verification passed. No database writes were performed.');
}

main().catch((error) => {
  console.error('KPI intern computation verification failed', error);
  process.exitCode = 1;
});

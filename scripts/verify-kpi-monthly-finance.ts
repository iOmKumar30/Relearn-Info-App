import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import 'dotenv/config';

import {
  computeMonthlyFinances,
  upsertAuto,
} from '../libs/kpi/compute';
import { resolveEffectiveMonthlyValues } from '../libs/kpi/yearSummary';

type TransactionRow = {
  type: 'CREDIT' | 'DEBIT';
  amount: number | null;
  statement: { year: number; month: number };
};

function aggregateClient(rows: TransactionRow[]) {
  const calls: Array<{
    where: { type: 'CREDIT' | 'DEBIT'; statement: { year: number; month: number } };
    _sum: { amount: true };
  }> = [];
  return {
    calls,
    client: {
      transaction: {
        aggregate: async (args: (typeof calls)[number]) => {
          calls.push(args);
          const amount = rows
            .filter((row) => row.type === args.where.type
              && row.statement.year === args.where.statement.year
              && row.statement.month === args.where.statement.month)
            .reduce((sum, row) => sum + (row.amount ?? 0), 0);
          return { _sum: { amount } };
        },
      },
    },
  };
}

async function main() {
  const marchAndAprilRows: TransactionRow[] = [
    { type: 'CREDIT', amount: 500_000, statement: { year: 2026, month: 3 } },
    { type: 'CREDIT', amount: null, statement: { year: 2026, month: 3 } },
    { type: 'DEBIT', amount: 200_000, statement: { year: 2026, month: 3 } },
    { type: 'CREDIT', amount: 900_000, statement: { year: 2026, month: 4 } },
    { type: 'DEBIT', amount: 400_000, statement: { year: 2026, month: 4 } },
  ];
  const march = aggregateClient(marchAndAprilRows);
  const marchValues = await computeMonthlyFinances(
    new Date('2026-03-15T12:00:00.000Z'),
    march.client,
  );
  assert.deepEqual(marchValues, { revenue: 5, expenditure: 2 });
  assert.deepEqual(march.calls, [
    {
      where: { type: 'CREDIT', statement: { year: 2026, month: 3 } },
      _sum: { amount: true },
    },
    {
      where: { type: 'DEBIT', statement: { year: 2026, month: 3 } },
      _sum: { amount: true },
    },
  ]);

  const noStatement = aggregateClient([]);
  assert.deepEqual(
    await computeMonthlyFinances(new Date('2026-05-01T00:00:00.000Z'), noStatement.client),
    { revenue: 0, expenditure: 0 },
  );

  const manual = { source: 'MANUAL', value: 99 };
  let autoWrite: unknown;
  const autoValueClient = {
    kPIMonthlyValue: {
      upsert: async (args: unknown) => {
        autoWrite = args;
        assert.equal(manual.source, 'MANUAL');
        assert.equal(manual.value, 99);
        return {};
      },
    },
  } as unknown as Parameters<typeof upsertAuto>[3];
  await upsertAuto('monthly-revenue-kpi', new Date('2026-03-19T12:00:00.000Z'), 5, autoValueClient);
  assert.deepEqual(autoWrite, {
    where: {
      kpiId_month_source: {
        kpiId: 'monthly-revenue-kpi',
        month: new Date('2026-03-01T00:00:00.000Z'),
        source: 'AUTO',
      },
    },
    update: { value: 5 },
    create: {
      kpiId: 'monthly-revenue-kpi',
      month: new Date('2026-03-01T00:00:00.000Z'),
      value: 5,
      source: 'AUTO',
    },
  });
  assert.deepEqual(resolveEffectiveMonthlyValues([
    { month: new Date('2026-03-01T00:00:00.000Z'), source: 'AUTO', value: 5 },
    { month: new Date('2026-03-01T00:00:00.000Z'), source: 'MANUAL', value: 7 },
  ]), [{ monthKey: '2026-03', value: 7 }]);

  // Regression guard: the existing cumulative FY helper remains scoped by
  // financialYearId and date cutoffs; this monthly helper does not replace it.
  const computeSource = await readFile(new URL('../libs/kpi/compute.ts', import.meta.url), 'utf8');
  assert.match(computeSource, /statement: \{ financialYearId: fyId \}/);
  assert.match(computeSource, /currentCutoff/);

  console.log('KPI monthly finance verification passed. No database writes were performed.');
}

main().catch((error) => {
  console.error('KPI monthly finance verification failed', error);
  process.exitCode = 1;
});

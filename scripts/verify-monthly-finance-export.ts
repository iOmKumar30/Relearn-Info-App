import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  buildMonthlyFinanceExport,
  type MonthlyExportTransaction,
} from '../libs/finance/monthly-export';
import {
  createMonthlyFinanceWorkbook,
  MONTHLY_EXPORT_COLUMNS,
  MONTHLY_TABLE_HEADER_ROW,
} from '../libs/finance/monthly-workbook';

const date = new Date('2026-11-03T13:00:00Z');
const base: MonthlyExportTransaction = {
  id: 'simple',
  txnDate: date,
  valueDate: new Date('2026-11-04T13:00:00Z'),
  description: 'Synthetic bank transaction',
  comment: 'Internal note',
  txnId: '00001234567890123456',
  refNo: '000789',
  branchCode: '00012',
  type: 'CREDIT',
  amount: '25.15',
  runningBalance: '1025.15',
  reason: 'Donation',
  partyName: 'Annual Member',
  splits: [],
};

async function main() {
  const transactions: MonthlyExportTransaction[] = [
    ...Array.from({ length: 6 }, (_, index) => ({
      ...base,
      id: `simple-${index}`,
      amount: '10',
      runningBalance: String(1010 + index * 10),
    })),
    {
      ...base,
      id: 'payout',
      amount: '980',
      runningBalance: '2040',
      description: 'Razorpay payout',
      comment: 'Gross donations less settlement fees',
      splits: [
        {
          amount: '1000',
          partyName: 'Life Member',
          reason: 'Membership contribution',
        },
        {
          amount: '-20',
          partyName: 'Razorpay',
          reason: 'Payment gateway charges',
        },
      ],
    },
    {
      ...base,
      id: 'debit',
      type: 'DEBIT',
      amount: '100',
      runningBalance: '1940',
      splits: [
        { amount: '120', partyName: 'Supplier', reason: 'Training materials' },
        { amount: '-20', partyName: 'Supplier', reason: 'Discount' },
      ],
    },
    {
      ...base,
      id: 'plain-debit',
      type: 'DEBIT',
      amount: '5',
      runningBalance: '1935',
      valueDate: null,
      comment: '=SUM(A1:A2)',
      partyName: '@Literal name',
      reason: 'Postage',
      splits: [],
    },
    {
      ...base,
      id: 'single-split',
      amount: '50',
      runningBalance: '1985',
      splits: [
        { amount: '50', partyName: 'Founder Member', reason: 'Contribution' },
      ],
    },
  ];
  const snapshot = JSON.stringify(transactions);
  const report = buildMonthlyFinanceExport(transactions);
  assert.equal(JSON.stringify(transactions), snapshot);
  assert.equal(report.parentCount, 10);
  assert.equal(report.rows.length, 12);
  assert.deepEqual(
    report.rows.map((row) => row.serialNo),
    [
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
      'C7.1',
      'C7.2',
      'D1.1',
      'D1.2',
      'D2',
      'C8.1',
    ],
  );
  const child = report.rows[6];
  for (const key of [
    'txnDate',
    'valueDate',
    'description',
    'comment',
    'txnId',
    'refNo',
    'branchCode',
    'runningBalance',
    'type',
  ] as const) {
    const value = transactions[6][key];
    assert.deepEqual(
      child[key],
      key === 'runningBalance' ? Number(value) : value,
    );
  }
  assert.equal(child.amount, 1000);
  assert.equal(child.reason, 'Membership contribution');
  assert.equal(child.partyName, 'Life Member');
  assert.equal(report.rows[7].amount, -20);
  assert.equal(report.rows[7].type, 'CREDIT');
  assert.equal(report.rows[7].runningBalance, 2040);
  assert.equal(report.summary.totalIncome, 1090);
  assert.equal(report.summary.totalExpense, 105);
  assert.equal(report.summary.openingBalance, 1000);
  assert.equal(report.summary.closingBalance, 1985);
  for (const type of ['CREDIT', 'DEBIT']) {
    const sum = report.rows
      .filter((row) => row.type === type)
      .reduce((total, row) => total + Math.round((row.amount ?? 0) * 100), 0);
    assert.equal(
      sum / 100,
      type === 'CREDIT'
        ? report.summary.totalIncome
        : report.summary.totalExpense,
    );
  }
  const filtered = buildMonthlyFinanceExport(transactions, 'gateway charges');
  assert.deepEqual(
    filtered.rows.map((row) => row.serialNo),
    ['C7.1', 'C7.2'],
  );
  assert.deepEqual(filtered.summary, report.summary);
  assert.equal(filtered.matchedParents, 1);
  assert.equal(
    buildMonthlyFinanceExport(transactions, 'missing').rows.length,
    0,
  );
  assert.throws(
    () =>
      buildMonthlyFinanceExport([
        {
          ...transactions[6],
          splits: [{ amount: 900, partyName: 'Bad', reason: 'Mismatch' }],
        },
      ]),
    /inconsistent breakdown/,
  );
  assert.equal(MONTHLY_EXPORT_COLUMNS.length, 13);
  assert(
    !MONTHLY_EXPORT_COLUMNS.some(
      (column) => String(column.key) === 'breakdown',
    ),
  );

  const workbook = createMonthlyFinanceWorkbook(report, {
    month: 11,
    year: 2026,
    generatedAt: new Date('2026-11-15T09:30:00Z'),
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(buffer);
  const sheet = reloaded.getWorksheet('Monthly Transactions')!;
  assert.equal(sheet.columnCount, 13);
  assert.equal(sheet.rowCount, MONTHLY_TABLE_HEADER_ROW + report.rows.length);
  const first = sheet.getRow(MONTHLY_TABLE_HEADER_ROW + 1);
  assert(first.getCell(2).value instanceof Date);
  assert.equal(
    (first.getCell(2).value as Date).toISOString(),
    '2026-11-03T00:00:00.000Z',
  );
  assert.equal(first.getCell(6).value, base.txnId);
  assert.equal(first.getCell(8).value, '00012');
  const chargeRow = sheet.getRow(MONTHLY_TABLE_HEADER_ROW + 8);
  assert.equal(chargeRow.getCell(1).value, 'C7.2');
  assert.equal(chargeRow.getCell(10).value, -20);
  assert.equal(typeof chargeRow.getCell(11).value, 'number');
  assert.match(chargeRow.getCell(10).numFmt, /Red/);
  assert.equal(
    sheet.getRow(MONTHLY_TABLE_HEADER_ROW + 11).getCell(5).value,
    '=SUM(A1:A2)',
  );
  assert.equal(
    sheet.getRow(MONTHLY_TABLE_HEADER_ROW + 11).getCell(5).type,
    ExcelJS.ValueType.String,
  );
  assert.equal(sheet.views[0].state, 'frozen');
  assert(sheet.autoFilter);
  assert(sheet.getRow(11).getCell(4).alignment.wrapText);
  assert.equal(sheet.getCell('D5').value, 1000);
  assert.equal(sheet.getCell('J5').value, 1090);
  const empty = createMonthlyFinanceWorkbook(buildMonthlyFinanceExport([]), {
    month: 11,
    year: 2026,
  });
  assert.equal(
    empty.getWorksheet(1)!.getCell('A12').value,
    'No transactions match this export.',
  );

  // Optional synthetic preview fixture. Never reads .env or application data.
  if (process.argv[2]) {
    const destination = path.resolve(process.argv[2]);
    await mkdir(path.dirname(destination), { recursive: true });
    await workbook.xlsx.writeFile(destination);
  }
  console.log(
    'Monthly export passed: child-only rows, serials, inherited values, signed reconciliation, filtered numbering, styles, dates, literal text and XLSX round-trip. No database accessed.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

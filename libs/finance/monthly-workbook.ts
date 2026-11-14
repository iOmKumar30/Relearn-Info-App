import ExcelJS from 'exceljs';
import type {
  buildMonthlyFinanceExport,
  MonthlyExportRow,
} from './monthly-export';

export const MONTHLY_EXPORT_COLUMNS: {
  key: keyof MonthlyExportRow;
  label: string;
  width: number;
}[] = [
  { key: 'serialNo', label: 'SI No', width: 10 },
  { key: 'txnDate', label: 'Txn Date', width: 13 },
  { key: 'valueDate', label: 'Value Date', width: 13 },
  { key: 'description', label: 'Description', width: 36 },
  { key: 'comment', label: 'Comment', width: 36 },
  { key: 'txnId', label: 'Txn ID', width: 23 },
  { key: 'refNo', label: 'Ref No / Cheque No', width: 23 },
  { key: 'branchCode', label: 'Branch Code', width: 12 },
  { key: 'type', label: 'Type', width: 11 },
  { key: 'amount', label: 'Amount', width: 24 },
  { key: 'runningBalance', label: 'Balance', width: 24 },
  { key: 'reason', label: 'Reason (Why?)', width: 28 },
  { key: 'partyName', label: 'Person Received/Paid', width: 30 },
];

const MONEY_FORMAT = '#,##0.00;[Red](#,##0.00);0.00';
const TABLE_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};
export const MONTHLY_TABLE_HEADER_ROW = 11;

export function createMonthlyFinanceWorkbook(
  report: ReturnType<typeof buildMonthlyFinanceExport>,
  options: { month: number; year: number; query?: string; generatedAt?: Date },
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Relearn Foundation';
  workbook.created = options.generatedAt ?? new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet('Monthly Transactions', {
    views: [
      {
        showGridLines: false,
        state: 'frozen',
        ySplit: MONTHLY_TABLE_HEADER_ROW,
      },
    ],
    pageSetup: {
      orientation: 'landscape',
      // OpenXML paper size 8 is A3; ExcelJS's enum omits this valid size.
      paperSize: 8 as ExcelJS.PaperSize,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  sheet.properties.defaultRowHeight = 24;
  sheet.columns = MONTHLY_EXPORT_COLUMNS.map((column) => ({
    key: column.key,
    width: column.width,
  }));
  function banner(row: number, text: string, height: number) {
    sheet.mergeCells(row, 1, row, MONTHLY_EXPORT_COLUMNS.length);
    const cell = sheet.getCell(row, 1);
    cell.value = text;
    cell.font = {
      name: 'Arial',
      size: row === 2 ? 16 : 10,
      bold: row === 2,
      color: { argb: row === 2 ? 'FF17365D' : 'FF475569' },
    };
    cell.alignment = { vertical: 'middle', wrapText: true };
    sheet.getRow(row).height = height;
  }
  const period = new Date(
    Date.UTC(options.year, options.month - 1, 1),
  ).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  banner(2, 'Relearn Foundation — Monthly Financial Transactions', 30);
  banner(
    3,
    `${period}. Generated ${workbook.created.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Currency: INR.`,
    24,
  );
  function metric(
    row: number,
    labelFrom: number,
    labelTo: number,
    valueFrom: number,
    valueTo: number,
    label: string,
    amount: number,
  ) {
    sheet.mergeCells(row, labelFrom, row, labelTo);
    sheet.mergeCells(row, valueFrom, row, valueTo);
    const text = sheet.getCell(row, labelFrom);
    text.value = label;
    text.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF17365D' },
    };
    text.alignment = { vertical: 'middle' };
    const value = sheet.getCell(row, valueFrom);
    value.value = amount;
    value.numFmt = MONEY_FORMAT;
    value.font = { name: 'Arial', size: 10, bold: true };
    value.alignment = { horizontal: 'right', vertical: 'middle' };
  }
  metric(5, 1, 3, 4, 5, 'Opening balance', report.summary.openingBalance);
  metric(6, 1, 3, 4, 5, 'Closing balance', report.summary.closingBalance);
  metric(5, 7, 9, 10, 11, 'Monthly credits', report.summary.totalIncome);
  metric(6, 7, 9, 10, 11, 'Monthly debits', report.summary.totalExpense);
  banner(
    7,
    'Summary figures cover the full month and count each bank transaction once.',
    22,
  );
  banner(
    8,
    `Export scope: ${options.query?.trim() ? `matching “${options.query.trim()}”` : 'all transactions'}. ${report.matchedParents} of ${report.parentCount} bank transactions. ${report.rows.length} exported rows.`,
    30,
  );
  banner(
    9,
    'Compound parents are replaced by their children. Balance is the parent bank balance, repeated for reference; do not sum it. Type is inherited; negative amounts are offsets.',
    30,
  );

  const header = sheet.getRow(MONTHLY_TABLE_HEADER_ROW);
  header.values = MONTHLY_EXPORT_COLUMNS.map((column) => column.label);
  header.height = 34;
  header.eachCell((cell) => {
    cell.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = TABLE_BORDER;
  });

  report.rows.forEach((record, index) => {
    const row = sheet.addRow(
      MONTHLY_EXPORT_COLUMNS.map((column) => {
        const value = record[column.key];
        // Export dates as real Excel dates without the source's time component.
        if (value instanceof Date)
          return new Date(
            Date.UTC(
              value.getUTCFullYear(),
              value.getUTCMonth(),
              value.getUTCDate(),
            ),
          );
        return value;
      }),
    );
    let lines = 1;
    MONTHLY_EXPORT_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      const isMoney =
        column.key === 'amount' || column.key === 'runningBalance';
      const isDate = column.key === 'txnDate' || column.key === 'valueDate';
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 ? 'FFD9E2F3' : 'FFF0F4FA' },
      };
      cell.border = TABLE_BORDER;
      cell.alignment = {
        horizontal: isMoney
          ? 'right'
          : isDate || column.key === 'serialNo' || column.key === 'type'
            ? 'center'
            : 'left',
        vertical: 'middle',
        wrapText: true,
        indent:
          isDate || column.key === 'serialNo' || column.key === 'type' ? 0 : 1,
      };
      cell.numFmt = isMoney ? MONEY_FORMAT : isDate ? 'dd-mm-yyyy' : '@';
      if (typeof cell.value === 'string')
        lines = Math.max(
          lines,
          cell.value
            .split(/\r?\n/)
            .reduce(
              (count, line) =>
                count +
                Math.max(1, Math.ceil(line.length / (column.width - 2))),
              0,
            ),
        );
    });
    row.height = Math.min(409, Math.max(30, lines * 13 + 8));
  });
  if (!report.rows.length)
    banner(
      MONTHLY_TABLE_HEADER_ROW + 1,
      'No transactions match this export.',
      30,
    );
  const lastRow = MONTHLY_TABLE_HEADER_ROW + report.rows.length;
  sheet.autoFilter = {
    from: { row: MONTHLY_TABLE_HEADER_ROW, column: 1 },
    to: {
      row: Math.max(MONTHLY_TABLE_HEADER_ROW, lastRow),
      column: MONTHLY_EXPORT_COLUMNS.length,
    },
  };
  sheet.pageSetup.printTitlesRow = `${MONTHLY_TABLE_HEADER_ROW}:${MONTHLY_TABLE_HEADER_ROW}`;
  sheet.pageSetup.printArea = `A1:M${Math.max(lastRow, MONTHLY_TABLE_HEADER_ROW + 1)}`;
  return workbook;
}

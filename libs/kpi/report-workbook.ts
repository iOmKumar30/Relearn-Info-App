import ExcelJS from 'exceljs';
import type { KpiReport } from './report';

export function createKpiReportWorkbook(report: KpiReport, sheetName: string) {
  const workbook = new ExcelJS.Workbook();
  const tableBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: false, state: 'frozen', xSplit: 3, ySplit: 1 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthHeaders = report.months.map((month) => {
    const [year, number] = month.split('-').map(Number);
    return `${monthNames[number - 1]} ${year}`;
  });
  sheet.addRow(['SLNO', 'KPI', `TARGET\n(${report.fiscalLabel})`, ...monthHeaders]);
  report.rows.forEach((row, index) => {
    const excelRow = sheet.addRow([index + 1, row.label, row.target, ...row.values]);
    excelRow.height = [3, 4, 7].includes(index) ? 38 : 32;
    for (let column = 1; column <= 3 + report.months.length; column++) {
      const cell = excelRow.getCell(column);
      cell.font = { name: 'Times New Roman', size: 12, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFB4C6E7' : 'FFD9E2F3' } };
      cell.alignment = { horizontal: column === 2 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      cell.border = tableBorder;
      if (column >= 3) cell.numFmt = row.unit === 'PERCENT'
        ? (column === 3 && Number.isInteger(Number(cell.value) * 100) ? '0%' : '0.0%')
        : row.unit === 'LAKHS' && !Number.isInteger(cell.value) ? '0.##' : '0';
    }
  });
  const header = sheet.getRow(1);
  header.height = 38;
  header.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = tableBorder;
  });
  sheet.getColumn(1).width = 7;
  sheet.getColumn(2).width = 38;
  sheet.getColumn(3).width = 17;
  report.months.forEach((_, index) => { sheet.getColumn(index + 4).width = 15; });
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(3 + report.months.length).letter}${report.rows.length + 1}`;
  sheet.pageSetup.printTitlesRow = '1:1';
  return workbook;
}

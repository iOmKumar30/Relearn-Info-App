'use client';

import {
  getLegacyBoardResultHeaderMap,
  LEGACY_BOARD_RESULT_COLUMNS,
  type LegacyBoardResultInput,
  validateLegacyBoardResultInput,
} from '@/libs/legacy-board-results';
import * as XLSX from 'xlsx';

export type ParsedLegacyBoardResults = {
  rows: LegacyBoardResultInput[];
  sheetName: string;
};

export async function readLegacyBoardResultsFile(
  file: File,
): Promise<ParsedLegacyBoardResults> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The workbook does not contain a worksheet');

  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const [headers, ...dataRows] = matrix;
  if (!headers?.length) throw new Error('The worksheet is empty');

  const headerMap = getLegacyBoardResultHeaderMap(headers);
  const required = ['passingYear', 'studentName', 'schoolName'] as const;
  const missing = required.filter((key) => headerMap[key] === undefined);
  if (missing.length) {
    const names = missing.map(
      (key) => LEGACY_BOARD_RESULT_COLUMNS.find((column) => column.key === key)?.label,
    );
    throw new Error(`Missing required column(s): ${names.join(', ')}`);
  }

  const rows: LegacyBoardResultInput[] = [];
  dataRows.forEach((sourceRow, index) => {
    if (sourceRow.every((value) => String(value ?? '').trim() === '')) return;

    const raw = Object.fromEntries(
      Object.entries(headerMap).map(([key, columnIndex]) => [
        key,
        sourceRow[columnIndex as number],
      ]),
    ) as Partial<LegacyBoardResultInput>;

    try {
      rows.push(validateLegacyBoardResultInput(raw));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid data';
      throw new Error(`Row ${index + 2}: ${message}`);
    }
  });

  if (!rows.length) throw new Error('No data rows were found in the worksheet');
  return { rows, sheetName };
}

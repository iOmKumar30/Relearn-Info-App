'use server';

import { authOptions } from '@/libs/authOptions';
import {
  createLegacyBoardResultIdentityKey,
  type LegacyBoardResultInput,
  validateLegacyBoardResultInput,
} from '@/libs/legacy-board-results';
import prisma from '@/libs/prismadb';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

const ALLOWED_ROLES = new Set([
  'ADMIN',
  'FACILITATOR',
  'TUTOR',
  'RELF_EMPLOYEE',
]);
const IMPORT_BATCH_SIZE = 25;

async function requireLegacyBoardResultsAccess() {
  const session = await getServerSession(authOptions);
  const roles = session?.user?.roles ?? [];
  if (!session?.user?.id) throw new Error('Unauthorized');
  if (!roles.some((role) => ALLOWED_ROLES.has(String(role).toUpperCase()))) {
    throw new Error('Forbidden');
  }
}

function resultData(input: LegacyBoardResultInput) {
  return {
    identityKey: createLegacyBoardResultIdentityKey(
      input.studentName,
      input.schoolName,
    ),
    passingYear: input.passingYear,
    studentName: input.studentName,
    schoolName: input.schoolName,
    board: input.board ?? null,
    totalMarks: input.totalMarks ?? null,
    marksObtained: input.marksObtained ?? null,
    grade: input.grade ?? null,
    reportCardUrl: input.reportCardUrl ?? null,
    studentPhotoUrl: input.studentPhotoUrl ?? null,
    parentContactNumber: input.parentContactNumber ?? null,
    classroomTutor: input.classroomTutor ?? null,
  };
}

function serializeResult(row: {
  id: string;
  identityKey: string;
  passingYear: number;
  studentName: string;
  schoolName: string;
  board: string | null;
  totalMarks: number | null;
  marksObtained: number | null;
  grade: string | null;
  reportCardUrl: string | null;
  studentPhotoUrl: string | null;
  parentContactNumber: string | null;
  classroomTutor: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { identityKey: _identityKey, ...result } = row;
  return {
    ...result,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type LegacyBoardResultsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  year?: string;
  sort?: 'latest' | 'oldest';
};

export async function getLegacyBoardResults(
  query: LegacyBoardResultsQuery = {},
) {
  await requireLegacyBoardResultsAccess();

  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Math.floor(Number(query.pageSize) || 20)),
  );
  const search = String(query.search ?? '').trim();
  const yearText = String(query.year ?? '').trim();
  const year = yearText ? Number(yearText) : null;
  if (yearText && (!Number.isInteger(year) || year! < 1900 || year! > 2100)) {
    throw new Error('Enter a valid year between 1900 and 2100');
  }

  const where: Prisma.LegacyBoardResultWhereInput = {
    ...(year ? { passingYear: year } : {}),
    ...(search
      ? {
          OR: [
            { studentName: { contains: search, mode: 'insensitive' } },
            { schoolName: { contains: search, mode: 'insensitive' } },
            { board: { contains: search, mode: 'insensitive' } },
            { grade: { contains: search, mode: 'insensitive' } },
            { parentContactNumber: { contains: search, mode: 'insensitive' } },
            { classroomTutor: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.legacyBoardResult.count({ where }),
    prisma.legacyBoardResult.findMany({
      where,
      orderBy: [
        { passingYear: query.sort === 'oldest' ? 'asc' : 'desc' },
        { studentName: 'asc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, rows: rows.map(serializeResult) };
}

export async function createLegacyBoardResult(raw: LegacyBoardResultInput) {
  await requireLegacyBoardResultsAccess();
  const input = validateLegacyBoardResultInput(raw);

  try {
    const result = await prisma.legacyBoardResult.create({
      data: resultData(input),
    });
    revalidatePath('/legacy-board-results');
    return serializeResult(result);
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      throw new Error(
        'A result with this passing year, student name, and school already exists',
      );
    }
    throw error;
  }
}

export async function updateLegacyBoardResult(
  id: string,
  raw: LegacyBoardResultInput,
) {
  await requireLegacyBoardResultsAccess();
  if (!id) throw new Error('Result id is required');
  const input = validateLegacyBoardResultInput(raw);

  try {
    const result = await prisma.legacyBoardResult.update({
      where: { id },
      data: resultData(input),
    });
    revalidatePath('/legacy-board-results');
    return serializeResult(result);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'P2025') throw new Error('Legacy result not found');
    if (code === 'P2002') {
      throw new Error(
        'A result with this passing year, student name, and school already exists',
      );
    }
    throw error;
  }
}

export async function deleteLegacyBoardResult(id: string) {
  await requireLegacyBoardResultsAccess();
  if (!id) throw new Error('Result id is required');

  try {
    await prisma.legacyBoardResult.delete({ where: { id } });
    revalidatePath('/legacy-board-results');
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      throw new Error('Legacy result not found');
    }
    throw error;
  }
}

export async function bulkUpsertLegacyBoardResults(
  rawRows: LegacyBoardResultInput[],
) {
  await requireLegacyBoardResultsAccess();

  if (!Array.isArray(rawRows) || !rawRows.length) {
    throw new Error('No rows were supplied for import');
  }

  if (rawRows.length > 10000) {
    throw new Error('A single import is limited to 10,000 rows');
  }

  const rows = rawRows.map((row, index) => {
    try {
      return validateLegacyBoardResultInput(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid data';
      throw new Error(`Row ${index + 1}: ${message}`);
    }
  });

  const seen = new Set<string>();

  for (const row of rows) {
    const identityKey = createLegacyBoardResultIdentityKey(
      row.studentName,
      row.schoolName,
    );
    const key = `${row.passingYear}:${identityKey}`;

    if (seen.has(key)) {
      throw new Error(
        `The import contains duplicate rows for ${row.studentName} at ${row.schoolName} in ${row.passingYear}`,
      );
    }

    seen.add(key);
  }

  let created = 0;
  let updated = 0;

  for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + IMPORT_BATCH_SIZE);

    const batchKeys = batch.map((row) => ({
      passingYear: row.passingYear,
      identityKey: createLegacyBoardResultIdentityKey(
        row.studentName,
        row.schoolName,
      ),
    }));

    const existing = await prisma.legacyBoardResult.findMany({
      where: {
        OR: batchKeys.map(({ passingYear, identityKey }) => ({
          passingYear,
          identityKey,
        })),
      },
      select: {
        passingYear: true,
        identityKey: true,
      },
    });

    const existingKeys = new Set(
      existing.map((row) => `${row.passingYear}:${row.identityKey}`),
    );

    updated += existingKeys.size;
    created += batch.length - existingKeys.size;

    await prisma.$transaction(
      batch.map((row) => {
        const data = resultData(row);

        return prisma.legacyBoardResult.upsert({
          where: {
            passingYear_identityKey: {
              passingYear: row.passingYear,
              identityKey: data.identityKey,
            },
          },
          create: data,
          update: data,
        });
      }),
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  }

  revalidatePath('/legacy-board-results');

  return {
    imported: rows.length,
    created,
    updated,
  };
}

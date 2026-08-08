export type LegacyBoardResultInput = {
  passingYear: number;
  studentName: string;
  schoolName: string;
  board?: string | null;
  totalMarks?: number | null;
  marksObtained?: number | null;
  grade?: string | null;
  reportCardUrl?: string | null;
  studentPhotoUrl?: string | null;
  parentContactNumber?: string | null;
  classroomTutor?: string | null;
};

export const LEGACY_BOARD_RESULT_COLUMNS = [
  { key: 'passingYear', label: 'Year of Passing' },
  { key: 'studentName', label: 'Name of the Student' },
  { key: 'schoolName', label: 'School Name' },
  { key: 'board', label: 'Board' },
  { key: 'totalMarks', label: 'Total Marks' },
  { key: 'marksObtained', label: 'Marks Obtained' },
  { key: 'grade', label: 'Grade' },
  { key: 'reportCardUrl', label: 'Report Card Upload' },
  { key: 'studentPhotoUrl', label: "Student's Photo Upload" },
  { key: 'parentContactNumber', label: "Contact Number of Student's Parent" },
  { key: 'classroomTutor', label: "Classroom ID and Tutor's Name" },
] as const;

const HEADER_ALIASES: Record<keyof LegacyBoardResultInput, string[]> = {
  passingYear: ['year of passing', 'passing year', 'year'],
  studentName: ['name of the student', 'student name', 'name'],
  schoolName: ['school name', 'school'],
  board: ['board'],
  totalMarks: ['total marks', 'total'],
  marksObtained: ['marks obtained', 'obtained marks'],
  grade: ['grade'],
  reportCardUrl: ['report card upload', 'report card', 'report card url'],
  studentPhotoUrl: [
    "student's photo upload",
    'students photo upload',
    'student photo upload',
    'student photo',
    'student photo url',
  ],
  parentContactNumber: [
    "contact number of student's parent",
    'parent contact number',
    'parent phone',
    'contact number',
  ],
  classroomTutor: [
    'classroom id and tutor name',
    'classroom and tutor name',
    'classroom id tutor name',
    'classroom tutor',
    "classroom id and tutor's name",
  ],
};

export function normalizeLegacyBoardResultHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Used only for matching. Original values remain unchanged for display.
export function normalizeLegacyBoardResultIdentityValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createLegacyBoardResultIdentityKey(
  studentName: string,
  schoolName: string,
) {
  return `${normalizeLegacyBoardResultIdentityValue(studentName)}\u001f${normalizeLegacyBoardResultIdentityValue(schoolName)}`;
}

function normalizeOptionalString(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function parseOptionalNumber(value: unknown, label: string) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const number = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return number;
}

export function validateLegacyBoardResultInput(
  raw: Partial<LegacyBoardResultInput>,
): LegacyBoardResultInput {
  const passingYear = Number(raw.passingYear);
  const studentName = String(raw.studentName ?? '').trim();
  const schoolName = String(raw.schoolName ?? '').trim();
  const totalMarks = parseOptionalNumber(raw.totalMarks, 'Total marks');
  const marksObtained = parseOptionalNumber(raw.marksObtained, 'Marks obtained');

  if (!Number.isInteger(passingYear) || passingYear < 1900 || passingYear > 2100) {
    throw new Error('Year of passing must be a valid four-digit year');
  }
  if (!studentName) throw new Error('Student name is required');
  if (!schoolName) throw new Error('School name is required');
  if (!normalizeLegacyBoardResultIdentityValue(studentName)) {
    throw new Error('Student name must contain letters or numbers');
  }
  if (!normalizeLegacyBoardResultIdentityValue(schoolName)) {
    throw new Error('School name must contain letters or numbers');
  }
  if (totalMarks !== null && totalMarks <= 0) {
    throw new Error('Total marks must be greater than zero');
  }
  if (totalMarks !== null && marksObtained !== null && marksObtained > totalMarks) {
    throw new Error('Marks obtained cannot exceed total marks');
  }

  return {
    passingYear,
    studentName,
    schoolName,
    board: normalizeOptionalString(raw.board),
    totalMarks,
    marksObtained,
    grade: normalizeOptionalString(raw.grade),
    reportCardUrl: normalizeOptionalString(raw.reportCardUrl),
    studentPhotoUrl: normalizeOptionalString(raw.studentPhotoUrl),
    parentContactNumber: normalizeOptionalString(raw.parentContactNumber),
    classroomTutor: normalizeOptionalString(raw.classroomTutor),
  };
}

export function getLegacyBoardResultHeaderMap(headers: unknown[]) {
  const normalizedHeaders = headers.map(normalizeLegacyBoardResultHeader);
  const map = {} as Partial<Record<keyof LegacyBoardResultInput, number>>;

  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [keyof LegacyBoardResultInput, string[]]
  >) {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => normalizeLegacyBoardResultHeader(alias) === header),
    );
    if (index >= 0) map[key] = index;
  }

  return map;
}

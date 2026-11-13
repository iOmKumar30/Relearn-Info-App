import { currentMonthYYYYMM } from './month';

// Order and wording are part of the client's Excel report template.
export const KPI_REPORT_ROWS = [
  { key: 'students.total', label: 'No. of students' },
  { key: 'tutors.total', label: 'No. of tutors' },
  { key: 'classrooms.total', label: 'No. of classrooms' },
  { key: 'classrooms.senior.share', label: '% of senior classrooms (STD VI to STD X)' },
  { key: 'students.passed.x', label: 'No. of students passed class X' },
  { key: 'persons.trained', label: 'No. of persons trained' },
  { key: 'members.total', label: 'No. of members' },
  { key: 'projects.ongoing', label: 'No. of projects (CSR and Government)' },
  { key: 'entrepreneurs.created', label: 'No. of entrepreneurs created' },
  { key: 'finance.revenue.monthly.lakhs', label: 'Revenue (in Lakhs)', targetKey: 'finance.revenue.current.lakhs' },
  { key: 'finance.expenditure.monthly.lakhs', label: 'Expenditure (in Lakhs)', targetKey: 'finance.expenditure.current.lakhs' },
] as const;

export function getKpiReportMonths(
  year: number,
  month?: number,
  currentMonth = currentMonthYYYYMM(),
): string[] {
  if (month !== undefined) return [`${year}-${String(month).padStart(2, '0')}`];
  const [currentYear, currentMonthNumber] = currentMonth.split('-').map(Number);
  const count = year < currentYear ? 12 : year === currentYear ? currentMonthNumber - 1 : 0;
  return Array.from({ length: count }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

export type KpiReport = {
  months: string[];
  fiscalLabel: string;
  rows: Array<{
    label: string;
    unit: string;
    target: number | null;
    values: Array<number | null>;
  }>;
};

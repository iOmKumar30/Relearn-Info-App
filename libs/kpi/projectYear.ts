/**
 * Returns whether a project's stored calendar/fiscal-year string covers targetYear.
 * Supports one- or multi-year ranges, e.g. 2025-26, 2025-2026, or 2025-27.
 */
export function projectYearIncludes(projectYear: string | null | undefined, targetYear: number): boolean {
  if (!projectYear) return false;
  const value = projectYear.trim();
  if (/^\d{4}$/.test(value)) return Number(value) === targetYear;

  const range = /^(\d{4})\s*-\s*(\d{2}|\d{4})$/.exec(value);
  if (!range) return false;
  const startYear = Number(range[1]);
  const endYear = range[2].length === 2
    ? Math.floor(startYear / 100) * 100 + Number(range[2])
    : Number(range[2]);
  const normalizedEndYear = endYear < startYear ? endYear + 100 : endYear;
  return targetYear >= startYear && targetYear <= normalizedEndYear;
}

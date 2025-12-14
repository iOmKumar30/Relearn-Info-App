export function getDynamicFiscalYears(startYear = 2020): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const endStartYear = currentYear;

  const years: string[] = [];

  for (let y = startYear; y <= endStartYear; y++) {
    years.push(`${y}-${y + 1}`);
  }

  return years;
}

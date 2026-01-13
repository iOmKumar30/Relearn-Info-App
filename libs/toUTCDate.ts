export const toUTCDate = (dateStr?: string): Date | undefined => {
  if (!dateStr || !dateStr.trim()) return undefined;

  const trimmed = dateStr.trim();

  // 1. If it's already an ISO string (has "T" and "Z"), parse directly
  if (trimmed.includes("T") && trimmed.endsWith("Z")) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // 2. If it's just a date (YYYY-MM-DD), append UTC time
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return isNaN(date.getTime()) ? undefined : date;
};

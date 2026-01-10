export const toUTCDate = (dateStr?: string): Date | undefined => {
  if (!dateStr?.trim()) return undefined;
  const date = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  return isNaN(date.getTime()) ? undefined : date;
};

export const toUTCDate = (dateStr?: string | Date): Date | undefined => {
  if (!dateStr) return undefined;

  if (dateStr instanceof Date) {

    const safeDate = new Date(dateStr.getTime() + 12 * 60 * 60 * 1000);

    const year = safeDate.getFullYear();
    const month = safeDate.getMonth();
    const day = safeDate.getDate();

    return new Date(Date.UTC(year, month, day, 13, 0, 0));
  }

  const trimmed = String(dateStr).trim();

  if (trimmed.includes("T")) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? undefined : date;
  }

  const parts = trimmed.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    return new Date(Date.UTC(year, month, day, 13, 0, 0));
  }

  return undefined;
};

export const toLocalDateInput = (dateStr: string | Date | undefined) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

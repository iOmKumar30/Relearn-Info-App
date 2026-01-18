export const toLocalDateInput = (dateStr: string | undefined) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  // Check for invalid date
  if (isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};
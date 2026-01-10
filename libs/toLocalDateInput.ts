export const toLocalDateInput = (dateStr: string | undefined) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  // Check for invalid date
  if (isNaN(date.getTime())) return "";

  // Method 1: The "offset hack" (reliable for getting local YYYY-MM-DD)
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};
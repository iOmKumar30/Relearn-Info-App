export async function downloadKpiReport(year: string, month?: string) {
  const params = new URLSearchParams({ year });
  if (month !== undefined) params.set('month', month);
  window.location.assign(`/api/kpi/export/report?${params}`);
}

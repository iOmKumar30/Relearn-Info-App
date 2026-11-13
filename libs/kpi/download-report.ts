export async function downloadKpiReport(year: string, month?: string) {
  const params = new URLSearchParams({ year });
  if (month !== undefined) params.set('month', month);
  const response = await fetch(`/api/kpi/export/report?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(await response.text());
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = month === undefined ? `KPI_YTD_${year}.xlsx` : `KPI_${year}-${month.padStart(2, '0')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

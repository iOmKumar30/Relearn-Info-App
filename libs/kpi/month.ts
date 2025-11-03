// libs/kpi/month.ts
export function firstDayOfMonthFromYYYYMM(yyyymm: string): Date {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
}

export function currentMonthYYYYMM(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthsBackArray(lastMonth: Date, back: number): Date[] {
  const arr: Date[] = [];
  for (let i = back - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() - i, 1)
    );
    arr.push(d);
  }
  return arr;
}

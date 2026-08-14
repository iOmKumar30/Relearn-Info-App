import { authOptions } from "@/libs/authOptions";
import { canViewKpis } from "@/libs/kpi/auth";
import { firstDayOfMonthFromYYYYMM, nextMonthStart } from "@/libs/kpi/month";
import { parseMonthInput } from "@/libs/kpi/validation";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await canViewKpis(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  // e.g. ?from=2023-01&to=2026-06
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!fromStr || !toStr)
    return new NextResponse("Missing from/to params", { status: 400 });
  if (!parseMonthInput(fromStr) || !parseMonthInput(toStr) || fromStr > toStr)
    return new NextResponse("Invalid month range", { status: 400 });

  const fromDate = firstDayOfMonthFromYYYYMM(fromStr);
  const toDate = firstDayOfMonthFromYYYYMM(toStr);
  const monthSpan = (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 + toDate.getUTCMonth() - fromDate.getUTCMonth() + 1;
  if (monthSpan > 120) return new NextResponse("Month range cannot exceed 120 months", { status: 400 });

  // Build every month between from and to inclusive
  const months: Date[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    months.push(new Date(cursor));
    cursor.setTime(nextMonthStart(cursor).getTime());
  }

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const allValues = await prisma.kPIMonthlyValue.findMany({
    where: {
      kpiId: { in: kpis.map((k) => k.id) },
      month: { gte: fromDate, lte: toDate },
    },
  });

  // Resolve source precedence once, keyed by KPI and canonical month.
  const valuesByKpi = new Map<string, Map<number, { manual?: (typeof allValues)[number]; auto?: (typeof allValues)[number] }>>();
  for (const v of allValues) {
    if (!valuesByKpi.has(v.kpiId)) valuesByKpi.set(v.kpiId, new Map());
    const byMonth = valuesByKpi.get(v.kpiId)!;
    const entry = byMonth.get(v.month.getTime()) ?? {};
    if (v.source === 'MANUAL') entry.manual = v;
    else entry.auto = v;
    byMonth.set(v.month.getTime(), entry);
  }

  const out = kpis.map((k) => {
    const kpiValues = valuesByKpi.get(k.id) ?? new Map();

    const series = months.map((m) => {
      const ms = m.getTime();
      const resolved = kpiValues.get(ms);
      const eff = resolved?.manual ?? resolved?.auto;
      return {
        month: m.toISOString(),
        value: eff?.value ?? null,
        source: eff?.source ?? null,
      };
    });

    return {
      id: k.id,
      key: k.key,
      label: k.label,
      unit: k.unit,
      category: k.category,
      sortOrder: k.sortOrder,
      series,
    };
  });

  return NextResponse.json({ from: fromDate.toISOString(), to: toDate.toISOString(), kpis: out });
}

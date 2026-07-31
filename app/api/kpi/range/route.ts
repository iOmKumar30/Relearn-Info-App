import { authOptions } from "@/libs/authOptions";
import { firstDayOfMonthFromYYYYMM, monthsBackArray } from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  // e.g. ?from=2023-01&to=2026-06
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!fromStr || !toStr)
    return new NextResponse("Missing from/to params", { status: 400 });

  const fromDate = firstDayOfMonthFromYYYYMM(fromStr);
  const toDate = firstDayOfMonthFromYYYYMM(toStr);

  // Build every month between from and to inclusive
  const months: Date[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const allValues = await prisma.kPIMonthlyValue.findMany({
    where: {
      month: { gte: fromDate, lte: toDate },
    },
  });

  // Group by kpiId for O(1) lookups
  const valuesByKpi = new Map<string, typeof allValues>();
  for (const v of allValues) {
    if (!valuesByKpi.has(v.kpiId)) valuesByKpi.set(v.kpiId, []);
    valuesByKpi.get(v.kpiId)!.push(v);
  }

  const out = kpis.map((k) => {
    const kpiValues = valuesByKpi.get(k.id) ?? [];

    const series = months.map((m) => {
      const ms = m.getTime();
      const manual = kpiValues.find(
        (v) => v.source === "MANUAL" && v.month.getTime() === ms,
      );
      const auto = kpiValues.find(
        (v) => v.source === "AUTO" && v.month.getTime() === ms,
      );
      const eff = manual ?? auto;
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
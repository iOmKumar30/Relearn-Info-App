import { authOptions } from "@/libs/authOptions";
import { canViewKpis } from "@/libs/kpi/auth";
import {
  currentMonthYYYYMM,
  firstDayOfMonthFromYYYYMM,
  monthsBackArray,
} from "@/libs/kpi/month";
import { parseMonthInput, parseFiniteNumber } from "@/libs/kpi/validation";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await canViewKpis(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const monthStr = searchParams.get("month") || currentMonthYYYYMM();
  if (!parseMonthInput(monthStr)) return new NextResponse("Invalid month", { status: 400 });
  const requestedMonthsBack = parseFiniteNumber(searchParams.get("monthsBack") || 6);
  if (requestedMonthsBack === null || !Number.isInteger(requestedMonthsBack)) return new NextResponse("Invalid monthsBack", { status: 400 });
  const monthsBack = Math.max(1, Math.min(24, requestedMonthsBack));

  const month = firstDayOfMonthFromYYYYMM(monthStr);
  const months = monthsBackArray(month, monthsBack);

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const kpiIds = kpis.map((k) => k.id);
  const [allValues, allTargets] = await Promise.all([
    prisma.kPIMonthlyValue.findMany({ where: { kpiId: { in: kpiIds }, month: { in: months } }, orderBy: { month: "asc" } }),
    prisma.kPIFiscalTarget.findMany({ where: { kpiId: { in: kpiIds }, startDate: { lte: month }, endDate: { gte: month } }, orderBy: { startDate: "desc" } }),
  ]);
  const valuesByKpi = new Map<string, typeof allValues>();
  for (const value of allValues) valuesByKpi.set(value.kpiId, [...(valuesByKpi.get(value.kpiId) ?? []), value]);
  const targetsByKpi = new Map<string, (typeof allTargets)[number]>();
  for (const target of allTargets) if (!targetsByKpi.has(target.kpiId)) targetsByKpi.set(target.kpiId, target);

  const out = kpis.map((k) => {
      const values = valuesByKpi.get(k.id) ?? [];

      const trend = months.map((m) => {
        const ms = m.getTime();
        const manual = values.find(
          (v) => v.source === "MANUAL" && v.month.getTime() === ms
        );
        const auto = values.find(
          (v) => v.source === "AUTO" && v.month.getTime() === ms
        );
        const eff = manual ?? auto;
        return {
          month: m.toISOString(),
          value: eff?.value ?? null,
          source: eff?.source ?? null,
        };
      });

      const current = trend[trend.length - 1] ?? null;

      const target = targetsByKpi.get(k.id) ?? null;

      return {
        id: k.id,
        key: k.key,
        label: k.label,
        unit: k.unit,
        category: k.category,
        sortOrder: k.sortOrder,
        currentValue: current?.value ?? null,
        currentSource: current?.source ?? null,
        month: month.toISOString(),
        trend,
        target: target
          ? {
              fiscalLabel: target.fiscalLabel,
              targetValue: target.targetValue,
              startDate: target.startDate.toISOString(),
              endDate: target.endDate.toISOString(),
            }
          : null,
      };
    });

  return NextResponse.json({ month: month.toISOString(), kpis: out });
}

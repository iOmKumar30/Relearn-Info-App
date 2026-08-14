import { authOptions } from "@/libs/authOptions";
import { canViewKpis } from "@/libs/kpi/auth";
import { historicalKpiSkipReason } from "@/libs/kpi/backfill";
import { currentMonthYYYYMM, firstDayOfMonthFromYYYYMM } from "@/libs/kpi/month";
import { parseKpiYear, parseMonthInput } from "@/libs/kpi/validation";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ year: string; month: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await canViewKpis(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  const { year, month } = await ctx.params;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  if (parseKpiYear(year) === null || !parseMonthInput(monthStr)) return new NextResponse("Invalid month", { status: 400 });
  if (!(await prisma.kPIYear.findUnique({ where: { year: Number(year) }, select: { id: true } }))) {
    return new NextResponse('KPI year not found', { status: 404 });
  }
  const monthDate = firstDayOfMonthFromYYYYMM(monthStr);
  const isHistoricalMonth = monthStr < currentMonthYYYYMM();

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const kpiIds = kpis.map((k) => k.id);
  const [allValues, allTargets] = await Promise.all([
    prisma.kPIMonthlyValue.findMany({ where: { kpiId: { in: kpiIds }, month: monthDate } }),
    prisma.kPIFiscalTarget.findMany({ where: { kpiId: { in: kpiIds }, startDate: { lte: monthDate }, endDate: { gte: monthDate } }, orderBy: { startDate: 'desc' } }),
  ]);
  const valuesByKpi = new Map<string, typeof allValues>();
  for (const value of allValues) valuesByKpi.set(value.kpiId, [...(valuesByKpi.get(value.kpiId) ?? []), value]);
  const targetsByKpi = new Map<string, (typeof allTargets)[number]>();
  for (const target of allTargets) if (!targetsByKpi.has(target.kpiId)) targetsByKpi.set(target.kpiId, target);

  const out = kpis.map((k) => {
      const values = valuesByKpi.get(k.id) ?? [];

      // MANUAL takes priority over AUTO — same logic as existing /api/kpi
      const manual = values.find((v) => v.source === "MANUAL");
      const auto = values.find((v) => v.source === "AUTO");
      const effective = manual ?? auto ?? null;
      const historicalRecomputationReason = isHistoricalMonth
        ? historicalKpiSkipReason(k.key)
        : null;

      const target = targetsByKpi.get(k.id) ?? null;

      return {
        id: k.id,
        key: k.key,
        label: k.label,
        unit: k.unit,
        category: k.category,
        sortOrder: k.sortOrder,
        value: effective?.value ?? null,
        source: effective?.source ?? null,
        notes: effective?.notes ?? null,
        snapshotState: effective ? "SNAPSHOT" : "NO_SNAPSHOT",
        historicalAvailability: !effective && historicalRecomputationReason
          ? k.key === "entrepreneurs.created"
            ? "MANUAL_ENTRY_REQUIRED"
            : "HISTORICAL_DATA_UNAVAILABLE"
          : null,
        month: monthDate.toISOString(),
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

  return NextResponse.json({ month: monthDate.toISOString(), kpis: out });
}

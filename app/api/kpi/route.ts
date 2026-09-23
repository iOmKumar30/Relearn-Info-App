import { authOptions } from "@/libs/authOptions";
import { canViewKpis } from "@/libs/kpi/auth";
import { computeLiveMembersTotal, computeProjectsPast } from "@/libs/kpi/compute";
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
  const currentBusinessMonth = currentMonthYYYYMM();
  const monthStr = searchParams.get("month") || currentBusinessMonth;
  if (!parseMonthInput(monthStr)) return new NextResponse("Invalid month", { status: 400 });
  const requestedMonthsBack = parseFiniteNumber(searchParams.get("monthsBack") || 6);
  if (requestedMonthsBack === null || !Number.isInteger(requestedMonthsBack)) return new NextResponse("Invalid monthsBack", { status: 400 });
  const monthsBack = Math.max(1, Math.min(24, requestedMonthsBack));

  const month = firstDayOfMonthFromYYYYMM(monthStr);
  const months = monthsBackArray(month, monthsBack);
  const isLiveMonth = monthStr === currentBusinessMonth;

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const kpiIds = kpis.map((k) => k.id);
  const [allValues, allTargets, allLiveValues] = await Promise.all([
    prisma.kPIMonthlyValue.findMany({ where: { kpiId: { in: kpiIds }, month: { in: months } }, orderBy: { month: "asc" } }),
    prisma.kPIFiscalTarget.findMany({ where: { kpiId: { in: kpiIds }, startDate: { lte: month }, endDate: { gte: month } }, orderBy: { startDate: "desc" } }),
    isLiveMonth
      ? prisma.kPILiveValue.findMany({ where: { kpiId: { in: kpiIds } } })
      : Promise.resolve([]),
  ]);
  const valuesByKpi = new Map<string, typeof allValues>();
  for (const value of allValues) valuesByKpi.set(value.kpiId, [...(valuesByKpi.get(value.kpiId) ?? []), value]);
  const targetsByKpi = new Map<string, (typeof allTargets)[number]>();
  for (const target of allTargets) if (!targetsByKpi.has(target.kpiId)) targetsByKpi.set(target.kpiId, target);
  const liveValuesByKpi = new Map(allLiveValues.map((value) => [value.kpiId, value]));

  // The live past-project card is intentionally a current cumulative count.
  // A MANUAL value remains authoritative for the live month.
  const livePastProjects = isLiveMonth
    ? await computeProjectsPast(month)
    : null;
  const membersKpi = kpis.find((kpi) => kpi.key === "members.total");
  // After this migration first deploy, the daily 02:00 IST job might not have
  // populated the cache yet. Compute once for a correct live view; subsequent
  // reads use the daily cached value and do not add a database count query.
  const liveMembersTotal = isLiveMonth && membersKpi
    ? liveValuesByKpi.get(membersKpi.id)?.value ?? await computeLiveMembersTotal()
    : null;

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
        const useLivePastProjects =
          k.key === "projects.past" &&
          isLiveMonth &&
          m.getTime() === month.getTime() &&
          !manual;
        const useLiveMembersTotal =
          k.key === "members.total" &&
          isLiveMonth &&
          m.getTime() === month.getTime();
        const eff = useLiveMembersTotal
          ? { value: liveMembersTotal, source: "AUTO" as const }
          : useLivePastProjects
          ? { value: livePastProjects, source: "AUTO" as const }
          : manual ?? auto;
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

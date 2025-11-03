import { authOptions } from "@/libs/authOptions";
import {
  currentMonthYYYYMM,
  firstDayOfMonthFromYYYYMM,
  monthsBackArray,
} from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthStr = searchParams.get("month") || currentMonthYYYYMM();
  const monthsBack = Math.max(
    1,
    Math.min(24, Number(searchParams.get("monthsBack") || 6))
  );

  const month = firstDayOfMonthFromYYYYMM(monthStr);
  const months = monthsBackArray(month, monthsBack);

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const out = await Promise.all(
    kpis.map(async (k) => {
      const values = await prisma.kPIMonthlyValue.findMany({
        where: { kpiId: k.id, month: { in: months } },
        orderBy: { month: "asc" },
      });

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

      const target = await prisma.kPIFiscalTarget.findFirst({
        where: {
          kpiId: k.id,
          startDate: { lte: month },
          endDate: { gte: month },
        },
        orderBy: { startDate: "desc" },
      });

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
    })
  );

  return NextResponse.json({ month: month.toISOString(), kpis: out });
}

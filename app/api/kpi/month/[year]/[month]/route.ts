import { authOptions } from "@/libs/authOptions";
import { firstDayOfMonthFromYYYYMM } from "@/libs/kpi/month";
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

  const { year, month } = await ctx.params;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthDate = firstDayOfMonthFromYYYYMM(monthStr);

  const kpis = await prisma.kPI.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const out = await Promise.all(
    kpis.map(async (k) => {
      const values = await prisma.kPIMonthlyValue.findMany({
        where: { kpiId: k.id, month: monthDate },
      });

      // MANUAL takes priority over AUTO — same logic as existing /api/kpi
      const manual = values.find((v) => v.source === "MANUAL");
      const auto = values.find((v) => v.source === "AUTO");
      const effective = manual ?? auto ?? null;

      const target = await prisma.kPIFiscalTarget.findFirst({
        where: {
          kpiId: k.id,
          startDate: { lte: monthDate },
          endDate: { gte: monthDate },
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
        value: effective?.value ?? null,
        source: effective?.source ?? null,
        notes: effective?.notes ?? null,
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
    }),
  );

  return NextResponse.json({ month: monthDate.toISOString(), kpis: out });
}
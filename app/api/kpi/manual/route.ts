// POST method for manually upserting KPI Data
import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import { firstDayOfMonthFromYYYYMM } from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const { kpiKey, month, value, notes } = body;

  if (!kpiKey || !month || value === undefined) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const kpi = await prisma.kPI.findUnique({ where: { key: kpiKey } });
  if (!kpi) return new NextResponse("KPI not found", { status: 404 });

  const monthDate = firstDayOfMonthFromYYYYMM(month);

  const up = await prisma.kPIMonthlyValue.upsert({
    where: {
      kpiId_month_source: { kpiId: kpi.id, month: monthDate, source: "MANUAL" },
    },
    update: {
      value: Number(value),
      notes: notes ?? null,
      userId: session.user.id,
    },
    create: {
      kpiId: kpi.id,
      month: monthDate,
      value: Number(value),
      source: "MANUAL",
      notes: notes ?? null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(up);
}

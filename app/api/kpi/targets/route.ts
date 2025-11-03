// POST to set the targets
import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  // if (!(await isAdmin(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const { kpiKey, fiscalLabel, startDate, endDate, targetValue } = body;

  if (
    !kpiKey ||
    !fiscalLabel ||
    !startDate ||
    !endDate ||
    targetValue === undefined
  ) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const kpi = await prisma.kPI.findUnique({ where: { key: kpiKey } });
  if (!kpi) return new NextResponse("KPI not found", { status: 404 });

  const up = await prisma.kPIFiscalTarget.upsert({
    where: { kpiId_fiscalLabel: { kpiId: kpi.id, fiscalLabel } },
    update: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetValue: Number(targetValue),
    },
    create: {
      kpiId: kpi.id,
      fiscalLabel,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetValue: Number(targetValue),
    },
  });

  return NextResponse.json(up);
}

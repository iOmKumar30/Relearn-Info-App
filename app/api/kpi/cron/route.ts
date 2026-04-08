import { currentMonthYYYYMM } from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";
import { NextResponse, type NextRequest } from "next/server";
import { executeWorkerJob } from "../worker/execute";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const monthStr = currentMonthYYYYMM();

    const existing = await prisma.kpiJobQueue.findFirst({
      where: {
        targetMonth: monthStr,
        status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
      },
    });

    if (!existing) {
      await prisma.kpiJobQueue.create({
        data: { targetMonth: monthStr, status: "PENDING" },
      });
    }

    const result = await executeWorkerJob();

    return NextResponse.json(
      {
        success: true,
        message: "Daily job queued and processed",
        workerResult: result,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

import { currentMonthYYYYMM } from '@/libs/kpi/month';
import prisma from '@/libs/prismadb';
import { NextResponse, type NextRequest } from 'next/server';
import { executeWorkerJob } from '../worker/execute';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targetMonth = currentMonthYYYYMM();
    const existing = await prisma.kpiJobQueue.findUnique({ where: { targetMonth } });
    if (!existing) {
      await prisma.kpiJobQueue.create({ data: { targetMonth, status: 'PENDING' } });
    } else if (existing.status !== 'PROCESSING') {
      await prisma.kpiJobQueue.update({ where: { id: existing.id }, data: { status: 'PENDING', lastError: null } });
    }
    const workerResult = await executeWorkerJob();
    if (!workerResult.success) {
      console.error('KPI cron worker failed', { targetMonth });
      return NextResponse.json({ success: false, message: 'KPI job processing failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'KPI job processed' });
  } catch (error) {
    console.error('KPI cron failed', error);
    return NextResponse.json({ error: 'Unable to process KPI job' }, { status: 500 });
  }
}

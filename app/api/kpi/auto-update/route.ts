import { authOptions } from '@/libs/authOptions';
import { isAdmin } from '@/libs/isAdmin';
import { currentMonthYYYYMM } from '@/libs/kpi/month';
import { parseMonthInput } from '@/libs/kpi/validation';
import { updateKpisTask } from '@/trigger/kpi-update';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body: unknown = await req.json().catch(() => ({}));
    const month = parseMonthInput((body as { month?: unknown }).month);
    if (!month) return NextResponse.json({ error: 'Invalid month; expected YYYY-MM' }, { status: 400 });

    const handle = await updateKpisTask.trigger({ monthStr: month });
    const warnings = month < currentMonthYYYYMM()
      ? ['Historical project KPIs are preserved as legacy snapshots because project lifecycle history is unavailable.']
      : [];
    return NextResponse.json({ success: true, message: 'KPI calculation queued.', jobId: handle.id, warnings }, { status: 202 });
  } catch (error) {
    console.error('KPI auto-update trigger failed', error);
    return NextResponse.json({ error: 'Unable to queue KPI calculation' }, { status: 500 });
  }
}

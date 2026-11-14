import { authOptions } from '@/libs/authOptions';
import prisma from '@/libs/prismadb';
import { buildMonthlyFinanceExport } from '@/libs/finance/monthly-export';
import { createMonthlyFinanceWorkbook } from '@/libs/finance/monthly-workbook';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: privateHeaders,
    });
  if (!session.user.roles?.includes('ADMIN'))
    return new NextResponse('Forbidden', {
      status: 403,
      headers: privateHeaders,
    });
  const query = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (query.length > 200)
    return new NextResponse('Search is too long (maximum 200 characters).', {
      status: 400,
      headers: privateHeaders,
    });
  const { statementId } = await params;
  try {
    const statement = await prisma.monthlyStatement.findUnique({
      where: { id: statementId },
      select: {
        month: true,
        year: true,
        transactions: {
          orderBy: { txnDate: 'asc' },
          select: {
            id: true,
            txnDate: true,
            valueDate: true,
            description: true,
            comment: true,
            txnId: true,
            refNo: true,
            branchCode: true,
            type: true,
            amount: true,
            runningBalance: true,
            reason: true,
            partyName: true,
            splits: {
              orderBy: { position: 'asc' },
              select: { amount: true, reason: true, partyName: true },
            },
          },
        },
      },
    });
    if (!statement)
      return new NextResponse('Monthly statement not found.', {
        status: 404,
        headers: privateHeaders,
      });
    const report = buildMonthlyFinanceExport(statement.transactions, query);
    const workbook = createMonthlyFinanceWorkbook(report, {
      month: statement.month,
      year: statement.year,
      query,
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `RELF_${statement.year}-${String(statement.month).padStart(2, '0')}_Transactions${query ? '_Filtered' : ''}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...privateHeaders,
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('MONTHLY_FINANCE_EXPORT_ERROR', error);
    return new NextResponse(
      'Unable to export this month. Check that transaction breakdowns reconcile and try again.',
      { status: 500, headers: privateHeaders },
    );
  }
}

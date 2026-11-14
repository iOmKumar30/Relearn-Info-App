import prisma from '@/libs/prismadb';
import { isCurrentUserAdmin } from '@/libs/server-auth';
import {
  buildFinanceYearSearchQuery,
  YEAR_SEARCH_PAGE_SIZE,
} from '@/libs/finance-year-search';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ yearId: string }> },
) {
  if (!(await isCurrentUserAdmin()))
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403, headers },
    );

  const { yearId } = await params;
  const url = new URL(req.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const page = Number(url.searchParams.get('page') ?? 1);
  if (
    query.length > 200 ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000
  )
    return NextResponse.json(
      { error: 'Invalid search or page.' },
      { status: 400, headers },
    );
  if (!query)
    return NextResponse.json({ rows: [], hasMore: false }, { headers });

  try {
    const matches = await prisma.$queryRaw<{ id: string }[]>(
      buildFinanceYearSearchQuery(yearId, query, page),
    );
    const ids = matches.slice(0, YEAR_SEARCH_PAGE_SIZE).map((row) => row.id);
    const transactions = ids.length
      ? await prisma.transaction.findMany({
          where: { id: { in: ids }, statement: { financialYearId: yearId } },
          select: {
            id: true,
            txnDate: true,
            type: true,
            amount: true,
            partyName: true,
            reason: true,
            description: true,
            statementId: true,
            statement: { select: { month: true, year: true } },
            splits: {
              orderBy: { position: 'asc' },
              select: { id: true, partyName: true, reason: true, amount: true },
            },
          },
        })
      : [];
    const byId = new Map(transactions.map((row) => [row.id, row]));
    const rows = ids.flatMap((id) => {
      const row = byId.get(id);
      return row
        ? [
            {
              ...row,
              txnDate: row.txnDate?.toISOString() ?? null,
              amount: row.amount?.toString() ?? null,
              splits: row.splits.map((split) => ({
                ...split,
                amount: split.amount.toString(),
              })),
            },
          ]
        : [];
    });
    return NextResponse.json(
      { rows, hasMore: matches.length > YEAR_SEARCH_PAGE_SIZE },
      { headers },
    );
  } catch (error) {
    console.error('FINANCE_YEAR_SEARCH_ERROR', error);
    return NextResponse.json(
      { error: 'Unable to search transactions. Please try again.' },
      { status: 500, headers },
    );
  }
}

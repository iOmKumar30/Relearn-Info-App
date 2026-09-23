import { authOptions } from '@/libs/authOptions';
import getFinancialYear from '@/libs/getFinancialYear';
import { isAdmin } from '@/libs/isAdmin';
import prisma from '@/libs/prismadb';
import { syncDonationQueueTask } from '@/trigger/donation-sync';
import { Donation, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const body = await req.json();

    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim();
    const contact = String(body?.contact ?? '').trim();
    const address = String(body?.address ?? '').trim();
    const pan = String(body?.pan ?? '').trim();
    const amount = Number(body?.amount);
    const remarks = String(body?.remarks ?? 'No remarks').trim();
    const reason = String(body?.reason ?? 'Voluntary Contribution').trim();
    const method = String(body?.method ?? 'UPI').trim();
    const transactionId = String(body?.transactionId ?? '').trim();
    const gstno = String(body?.gstno ?? 'N/A').trim();
    // Parse Date
    const dateStr = body?.date;
    const date = dateStr ? new Date(dateStr) : new Date();

    // --- VALIDATION ---
    if (!name || !email || !amount || !transactionId || !contact) {
      return new NextResponse(
        'Missing required fields (Name, Email, Amount, Contact, Transaction ID)',
        {
          status: 400,
        },
      );
    }

    const financialYear = getFinancialYear();
    const donationId = createId();
    const createdRows = await prisma.$queryRaw<Donation[]>(Prisma.sql`
      WITH next_counter AS (
        INSERT INTO "counter" ("financialYear", "seq")
        VALUES (${financialYear}, 1)
        ON CONFLICT ("financialYear")
        DO UPDATE SET "seq" = "counter"."seq" + 1
        RETURNING "seq"
      )
      INSERT INTO "donation" (
        "id", "pan", "name", "address", "email", "contact", "reason",
        "remarks", "method", "amount", "date", "receiptNumber",
        "transactionId", "gstno"
      )
      SELECT
        ${donationId},
        ${pan || ''}, ${name}, ${address}, ${email}, ${contact}, ${reason},
        ${remarks}, ${method}, ${amount}, ${date},
        ${`RELF/FY ${financialYear}/`} || LPAD(next_counter."seq"::text, 3, '0'),
        ${transactionId}, ${gstno}
      FROM next_counter
      RETURNING *
    `);
    const created = createdRows[0];
    if (!created) throw new Error('Donation receipt was not created');

    try {
      await syncDonationQueueTask.trigger({ donationId: created.id });
    } catch (triggerError) {
      console.error('DONATION_SYNC_TRIGGER_ERROR', triggerError);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('DONATION_CREATE_ERROR', error);
    const duplicateTransactionId =
      (error.code === 'P2002' &&
        error.meta?.target?.includes('transactionId')) ||
      (error.code === 'P2010' &&
        error.meta?.code === '23505' &&
        String(error.meta?.message ?? '').includes(
          'donation_transactionId_key',
        ));
    if (duplicateTransactionId) {
      return new NextResponse('Transaction ID already exists', { status: 409 });
    }
    return new NextResponse('Internal Error', { status: 500 });
  }
}

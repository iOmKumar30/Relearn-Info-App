import prisma from "@/libs/prismadb";
import { schedules } from "@trigger.dev/sdk/v3";

const BATCH_SIZE = 50;
const STALE_PROCESSING_MS = 15 * 60 * 1000;

function fiscalLabelForDonation(date: Date): string {
  // Donation sync uses the calendar year specified for this integration:
  // a donation dated in 2026 belongs to fiscal label "2026-2027".
  const year = date.getUTCFullYear();
  return `${year}-${year + 1}`;
}

export const syncDonationQueueTask = schedules.task({
  id: "sync-donation-outbox",
  cron: "*/5 * * * *",
  maxDuration: 300,
  run: async () => {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    await prisma.donationSyncQueue.updateMany({
      where: { status: "PROCESSING", updatedAt: { lt: staleBefore } },
      data: { status: "PENDING" },
    });

    const pending = await prisma.donationSyncQueue.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
      select: { id: true, donationId: true },
    });

    const result = {
      fetched: pending.length,
      processed: 0,
      skippedNonMembers: 0,
      failed: 0,
      alreadyClaimed: 0,
    };

    for (const queueItem of pending) {
      const claim = await prisma.donationSyncQueue.updateMany({
        where: { id: queueItem.id, status: "PENDING" },
        data: { status: "PROCESSING" },
      });
      if (claim.count !== 1) {
        result.alreadyClaimed += 1;
        continue;
      }

      try {
        const donation = await prisma.donation.findUnique({
          where: { id: queueItem.donationId },
          select: { email: true, amount: true, date: true },
        });
        if (!donation) {
          throw new Error("Donation record was not found");
        }

        const user = await prisma.user.findUnique({
          where: { email: donation.email.trim().toLowerCase() },
          select: { member: { select: { id: true } } },
        });

        if (!user?.member) {
          await prisma.donationSyncQueue.update({
            where: { id: queueItem.id },
            data: { status: "PROCESSED" },
          });
          result.skippedNonMembers += 1;
          continue;
        }

        const fiscalLabel = fiscalLabelForDonation(donation.date);
        await prisma.$transaction(async (tx) => {
          await tx.memberFee.upsert({
            where: {
              memberId_fiscalLabel: {
                memberId: user.member!.id,
                fiscalLabel,
              },
            },
            update: {
              paidOn: donation.date,
              amount: donation.amount,
            },
            create: {
              memberId: user.member!.id,
              fiscalLabel,
              paidOn: donation.date,
              amount: donation.amount,
            },
          });
          await tx.donationSyncQueue.update({
            where: { id: queueItem.id },
            data: { status: "PROCESSED" },
          });
        });
        result.processed += 1;
      } catch (error) {
        result.failed += 1;
        console.error("[DONATION_SYNC] Failed queue item", {
          queueId: queueItem.id,
          donationId: queueItem.donationId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        await prisma.donationSyncQueue
          .updateMany({
            where: { id: queueItem.id, status: "PROCESSING" },
            data: { status: "FAILED" },
          })
          .catch(() => undefined);
      }
    }

    return result;
  },
});

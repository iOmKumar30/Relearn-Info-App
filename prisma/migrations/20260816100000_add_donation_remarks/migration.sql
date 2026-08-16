-- Keep the shared donation table aligned with the existing Prisma model.
-- The nullable column and default keep inserts from the payment application compatible.
ALTER TABLE "donation"
ADD COLUMN "remarks" TEXT DEFAULT 'No remarks';

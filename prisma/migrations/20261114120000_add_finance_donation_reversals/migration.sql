BEGIN;

-- Additive audit table; no existing fee, transaction or credit is changed.
CREATE TABLE "FinanceDonationReversal" (
  "creditId" TEXT PRIMARY KEY,
  "sourceKey" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "splitId" TEXT,
  "memberId" TEXT NOT NULL,
  "fiscalLabel" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0),
  "partyName" TEXT NOT NULL,
  "paidOn" TIMESTAMP(3) NOT NULL,
  "creditedById" TEXT NOT NULL,
  "creditedAt" TIMESTAMP(3) NOT NULL,
  "reversedById" TEXT NOT NULL,
  "reversedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FinanceDonationReversal_transactionId_idx" ON "FinanceDonationReversal"("transactionId");
CREATE INDEX "FinanceDonationReversal_memberId_fiscalLabel_idx" ON "FinanceDonationReversal"("memberId", "fiscalLabel");

COMMIT;

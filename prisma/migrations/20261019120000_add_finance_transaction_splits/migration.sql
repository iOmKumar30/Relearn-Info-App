-- Expand-only migration: historical transactions, balances and member fees
-- are deliberately left unchanged. Existing transactions have zero splits.
BEGIN;

ALTER TABLE "Transaction" ADD COLUMN "partyMemberId" TEXT;
-- A form opened before a finance credit must not overwrite that new amount.
ALTER TABLE "Member" ADD COLUMN "financeFeeRevision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "TransactionSplit" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "partyName" TEXT NOT NULL,
  "partyMemberId" TEXT,
  "reason" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransactionSplit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransactionSplit_positive_amount" CHECK ("amount" > 0)
);

CREATE TABLE "FinanceDonationCredit" (
  "id" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "splitId" TEXT,
  "memberId" TEXT NOT NULL,
  "fiscalLabel" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "partyName" TEXT NOT NULL,
  "paidOn" TIMESTAMP(3) NOT NULL,
  "creditedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceDonationCredit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceDonationCredit_positive_amount" CHECK ("amount" > 0)
);

CREATE INDEX "Transaction_partyMemberId_idx" ON "Transaction"("partyMemberId");
CREATE INDEX "TransactionSplit_transactionId_position_idx" ON "TransactionSplit"("transactionId", "position");
CREATE INDEX "TransactionSplit_partyMemberId_idx" ON "TransactionSplit"("partyMemberId");
CREATE UNIQUE INDEX "FinanceDonationCredit_sourceKey_key" ON "FinanceDonationCredit"("sourceKey");
CREATE UNIQUE INDEX "FinanceDonationCredit_splitId_key" ON "FinanceDonationCredit"("splitId");
CREATE INDEX "FinanceDonationCredit_transactionId_idx" ON "FinanceDonationCredit"("transactionId");
CREATE INDEX "FinanceDonationCredit_memberId_fiscalLabel_idx" ON "FinanceDonationCredit"("memberId", "fiscalLabel");

COMMIT;

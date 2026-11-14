BEGIN;

-- Preserve all existing rows; permit signed allocations but never zero.
ALTER TABLE "TransactionSplit"
  DROP CONSTRAINT "TransactionSplit_positive_amount",
  ADD CONSTRAINT "TransactionSplit_nonzero_amount" CHECK ("amount" <> 0);

COMMIT;

CREATE TABLE IF NOT EXISTS "payment_attempt" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "receipt" TEXT NOT NULL,
    "order_id" TEXT,
    "amount_in_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_attempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempt_idempotency_key_key" ON "payment_attempt"("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempt_receipt_key" ON "payment_attempt"("receipt");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempt_order_id_key" ON "payment_attempt"("order_id");
CREATE INDEX IF NOT EXISTS "payment_attempt_ip_hash_created_at_idx" ON "payment_attempt"("ip_hash", "created_at");
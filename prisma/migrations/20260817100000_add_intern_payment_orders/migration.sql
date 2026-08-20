-- Stores Razorpay order/payment references separately from the Intern record.
-- Existing intern data is untouched; payment orders are created only for new
-- online internship-payment attempts.
CREATE TYPE "InternPaymentOrderStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED');

CREATE TABLE "intern_payment_orders" (
    "id" TEXT NOT NULL,
    "intern_id" TEXT NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT,
    "receipt_number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "InternPaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intern_payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "intern_payment_orders_razorpay_order_id_key"
  ON "intern_payment_orders"("razorpay_order_id");
CREATE UNIQUE INDEX "intern_payment_orders_razorpay_payment_id_key"
  ON "intern_payment_orders"("razorpay_payment_id");
CREATE UNIQUE INDEX "intern_payment_orders_receipt_number_key"
  ON "intern_payment_orders"("receipt_number");
CREATE INDEX "intern_payment_orders_intern_id_status_idx"
  ON "intern_payment_orders"("intern_id", "status");
CREATE INDEX "intern_payment_orders_status_created_at_idx"
  ON "intern_payment_orders"("status", "created_at");

ALTER TABLE "intern_payment_orders"
  ADD CONSTRAINT "intern_payment_orders_intern_id_fkey"
  FOREIGN KEY ("intern_id") REFERENCES "Intern"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

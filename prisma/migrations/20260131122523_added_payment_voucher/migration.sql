-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "projectName" TEXT,
    "expenditureHead" TEXT,
    "payeeName" TEXT NOT NULL,
    "payeeMobile" TEXT,
    "items" JSONB,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "paymentMode" TEXT,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_voucherNo_key" ON "PaymentVoucher"("voucherNo");

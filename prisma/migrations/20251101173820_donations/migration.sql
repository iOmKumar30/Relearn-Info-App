-- CreateTable
CREATE TABLE "donation" (
    "id" TEXT NOT NULL,
    "pan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counter" (
    "financialYear" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,

    CONSTRAINT "counter_pkey" PRIMARY KEY ("financialYear")
);

-- CreateIndex
CREATE UNIQUE INDEX "donation_receiptNumber_key" ON "donation"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "donation_transactionId_key" ON "donation"("transactionId");

-- CreateIndex
CREATE INDEX "donation_date_idx" ON "donation"("date");

-- CreateIndex
CREATE INDEX "donation_email_idx" ON "donation"("email");

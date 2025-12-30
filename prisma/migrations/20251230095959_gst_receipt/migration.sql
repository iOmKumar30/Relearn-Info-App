-- CreateTable
CREATE TABLE "GstReceipt" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dateOfSupply" TEXT,
    "placeOfSupply" TEXT,
    "reverseCharge" TEXT DEFAULT 'N',
    "billToName" TEXT NOT NULL,
    "billToGstin" TEXT DEFAULT 'NA',
    "billToState" TEXT NOT NULL DEFAULT 'Jharkhand',
    "billToCode" TEXT DEFAULT '20',
    "shipToName" TEXT,
    "shipToGstin" TEXT DEFAULT 'NA',
    "shipToState" TEXT DEFAULT 'Jharkhand',
    "shipToCode" TEXT DEFAULT '20',
    "items" JSONB,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GstReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GstReceipt_invoiceNo_key" ON "GstReceipt"("invoiceNo");

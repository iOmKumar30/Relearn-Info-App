-- CreateEnum
CREATE TYPE "KPIValueSource" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "KPIUnit" AS ENUM ('COUNT', 'PERCENT', 'LAKHS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleName" ADD VALUE 'TUTOR_OF_TUTOR';
ALTER TYPE "RoleName" ADD VALUE 'MEMBER';

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" "KPIUnit" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIMonthlyValue" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "KPIValueSource" NOT NULL,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIMonthlyValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIFiscalTarget" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "fiscalLabel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIFiscalTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KPI_key_key" ON "KPI"("key");

-- CreateIndex
CREATE UNIQUE INDEX "KPIMonthlyValue_kpiId_month_source_key" ON "KPIMonthlyValue"("kpiId", "month", "source");

-- CreateIndex
CREATE UNIQUE INDEX "KPIFiscalTarget_kpiId_fiscalLabel_key" ON "KPIFiscalTarget"("kpiId", "fiscalLabel");

-- AddForeignKey
ALTER TABLE "KPIMonthlyValue" ADD CONSTRAINT "KPIMonthlyValue_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIFiscalTarget" ADD CONSTRAINT "KPIFiscalTarget_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

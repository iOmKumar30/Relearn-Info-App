-- Keep current/live KPI values separate from monthly reporting snapshots.
-- This prevents the daily 02:00 IST refresh from changing historical values.
CREATE TABLE "KPILiveValue" (
  "kpiId" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KPILiveValue_pkey" PRIMARY KEY ("kpiId"),
  CONSTRAINT "KPILiveValue_kpiId_fkey"
    FOREIGN KEY ("kpiId") REFERENCES "KPI"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "KPIMonthlyValue_month_kpiId_idx"
  ON "KPIMonthlyValue"("month", "kpiId");
CREATE INDEX "KPIFiscalTarget_kpiId_startDate_endDate_idx"
  ON "KPIFiscalTarget"("kpiId", "startDate", "endDate");
CREATE INDEX "MemberTypeHistory_memberType_startDate_endDate_idx"
  ON "MemberTypeHistory"("memberType", "startDate", "endDate");
CREATE UNIQUE INDEX "kpi_job_queue_targetMonth_key"
  ON "kpi_job_queue"("targetMonth");

-- KPI months are canonical UTC first-of-month snapshots. Prisma cannot model
-- this check directly, so keep it as a database invariant.
ALTER TABLE "KPIMonthlyValue"
  ADD CONSTRAINT "KPIMonthlyValue_month_is_first_utc"
  CHECK ("month" = date_trunc('month', "month"));

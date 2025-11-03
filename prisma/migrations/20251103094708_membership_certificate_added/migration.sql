-- CreateTable
CREATE TABLE "MembershipCertificate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "dateIssued" TIMESTAMP(3) NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipCertificate_certificateNo_key" ON "MembershipCertificate"("certificateNo");

-- CreateIndex
CREATE INDEX "MembershipCertificate_name_idx" ON "MembershipCertificate"("name");

-- CreateIndex
CREATE INDEX "MembershipCertificate_year_idx" ON "MembershipCertificate"("year");

-- CreateIndex
CREATE INDEX "MembershipCertificate_dateIssued_idx" ON "MembershipCertificate"("dateIssued");

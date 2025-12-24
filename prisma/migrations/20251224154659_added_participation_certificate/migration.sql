-- CreateTable
CREATE TABLE "ParticipationCertificate" (
    "id" TEXT NOT NULL,
    "certificateNo" TEXT,
    "name" TEXT NOT NULL,
    "aadhaar" TEXT,
    "classYear" TEXT NOT NULL,
    "institute" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipationCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationCertificate_certificateNo_key" ON "ParticipationCertificate"("certificateNo");

-- CreateIndex
CREATE INDEX "ParticipationCertificate_name_idx" ON "ParticipationCertificate"("name");

-- CreateIndex
CREATE INDEX "ParticipationCertificate_aadhaar_idx" ON "ParticipationCertificate"("aadhaar");

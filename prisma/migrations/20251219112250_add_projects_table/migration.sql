-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ONGOING',
    "conclusion" TEXT,
    "nextSteps" TEXT,
    "mentors" TEXT,
    "sponsoredBy" TEXT,
    "year" TEXT,
    "funds" DECIMAL(10,2),
    "place" TEXT,
    "targetGroup" TEXT,
    "beneficiaries" TEXT,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_year_idx" ON "Project"("year");

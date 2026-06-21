-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "historicalTutorId" TEXT,
ADD COLUMN     "standard" TEXT;

-- CreateIndex
CREATE INDEX "Student_historicalTutorId_idx" ON "Student"("historicalTutorId");

-- AlterTable
ALTER TABLE "BoardExamResult" ADD COLUMN     "classroomId" TEXT;

-- CreateIndex
CREATE INDEX "BoardExamResult_classroomId_idx" ON "BoardExamResult"("classroomId");

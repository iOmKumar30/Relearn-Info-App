/*
  Warnings:

  - You are about to drop the column `enteredByTutorId` on the `MonthlyClassroomAttendance` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "MonthlyClassroomAttendance_enteredByTutorId_idx";

-- AlterTable
ALTER TABLE "MonthlyClassroomAttendance" DROP COLUMN "enteredByTutorId",
ADD COLUMN     "entered_by_id" TEXT,
ADD COLUMN     "tutor_phone" TEXT,
ALTER COLUMN "totalStudentsEnrolled" DROP NOT NULL,
ALTER COLUMN "openDays" DROP NOT NULL,
ALTER COLUMN "totalPresent" DROP NOT NULL,
ALTER COLUMN "attendancePercentage" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_classroomId_year_idx" ON "MonthlyClassroomAttendance"("classroomId", "year");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_entered_by_id_idx" ON "MonthlyClassroomAttendance"("entered_by_id");

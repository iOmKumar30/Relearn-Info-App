-- CreateEnum
CREATE TYPE "TrainingAttendanceStatus" AS ENUM ('ABSENT', 'PRESENT', 'PRESENT_RESPONDED');

-- CreateTable
CREATE TABLE "TutorTrainingAttendance" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "status" "TrainingAttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorTrainingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorTrainingClass" (
    "id" TEXT NOT NULL,
    "year_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "trainingBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorTrainingClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorTrainingYear" (
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorTrainingYear_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE INDEX "TutorTrainingAttendance_tutor_id_idx" ON "TutorTrainingAttendance"("tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "TutorTrainingAttendance_class_id_tutor_id_key" ON "TutorTrainingAttendance"("class_id", "tutor_id");

-- CreateIndex
CREATE INDEX "TutorTrainingClass_year_id_month_idx" ON "TutorTrainingClass"("year_id", "month");

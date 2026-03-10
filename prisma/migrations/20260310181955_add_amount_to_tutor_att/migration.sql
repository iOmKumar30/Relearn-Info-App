-- AlterTable
ALTER TABLE "TutorTrainingAttendance" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TrainingPayoutRate" (
    "id" TEXT NOT NULL DEFAULT 'default_rate',
    "absentAmount" INTEGER NOT NULL DEFAULT 0,
    "presentAmount" INTEGER NOT NULL DEFAULT 50,
    "presentResponded" INTEGER NOT NULL DEFAULT 75,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPayoutRate_pkey" PRIMARY KEY ("id")
);

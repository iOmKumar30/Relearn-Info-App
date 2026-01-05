/*
  Warnings:

  - A unique constraint covering the columns `[memberId]` on the table `Intern` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[memberId]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Intern" ADD COLUMN     "memberId" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "memberId" TEXT;

-- CreateTable
CREATE TABLE "GlobalSequence" (
    "id" TEXT NOT NULL DEFAULT 'member_seq',
    "current" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Intern_memberId_key" ON "Intern"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberId_key" ON "Member"("memberId");

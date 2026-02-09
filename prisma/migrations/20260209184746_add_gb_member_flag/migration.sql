-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "isGoverningBody" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Member_isGoverningBody_idx" ON "Member"("isGoverningBody");

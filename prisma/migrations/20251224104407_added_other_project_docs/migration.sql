-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "approvalUrl" TEXT,
ADD COLUMN     "proposalUrl" TEXT,
ADD COLUMN     "rating" INTEGER DEFAULT 0,
ADD COLUMN     "utilizationUrl" TEXT;

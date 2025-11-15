-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('ANNUAL', 'INTERN', 'HONORARY', 'LIFE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberType" "MemberType" NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "leavingDate" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "feeAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberFee" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fiscalLabel" TEXT NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_memberType_idx" ON "Member"("memberType");

-- CreateIndex
CREATE INDEX "MemberFee_fiscalLabel_idx" ON "MemberFee"("fiscalLabel");

-- CreateIndex
CREATE UNIQUE INDEX "MemberFee_memberId_fiscalLabel_key" ON "MemberFee"("memberId", "fiscalLabel");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFee" ADD CONSTRAINT "MemberFee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

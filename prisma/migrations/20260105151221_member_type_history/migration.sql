-- CreateTable
CREATE TABLE "MemberTypeHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberType" "MemberType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberTypeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberTypeHistory_memberId_idx" ON "MemberTypeHistory"("memberId");

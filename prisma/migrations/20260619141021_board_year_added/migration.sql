-- CreateTable
CREATE TABLE "BoardExamYear" (
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardExamYear_pkey" PRIMARY KEY ("year")
);

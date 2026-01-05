-- CreateEnum
CREATE TYPE "InternStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED', 'PENDING_START');

-- CreateEnum
CREATE TYPE "WorkingMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'WAIVED');

-- CreateTable
CREATE TABLE "Intern" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "educationCompleted" TEXT,
    "institution" TEXT,
    "ongoingCourse" TEXT,
    "areasOfInterest" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "preferredHoursPerDay" TEXT,
    "workingMode" "WorkingMode",
    "associatedAfter" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "status" "InternStatus" NOT NULL DEFAULT 'ACTIVE',
    "feeAmount" INTEGER,
    "feePaidDate" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Intern_pkey" PRIMARY KEY ("id")
);

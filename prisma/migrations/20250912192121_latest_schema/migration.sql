/*
  Warnings:

  - You are about to drop the column `hashedPassword` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `UserRole` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."CentreStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."ClassroomStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."SectionCode" AS ENUM ('JR', 'SR');

-- CreateEnum
CREATE TYPE "public"."ClassTiming" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('M', 'F', 'O');

-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('PENDING', 'ADMIN', 'TUTOR', 'FACILITATOR', 'RELF_EMPLOYEE');

-- CreateEnum
CREATE TYPE "public"."OnboardingStatus" AS ENUM ('PENDING_PROFILE', 'SUBMITTED_PROFILE', 'PENDING_ROLE', 'ACTIVE', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "hashedPassword",
DROP COLUMN "image",
ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "address" TEXT,
ADD COLUMN     "onboardingStatus" "public"."OnboardingStatus" NOT NULL DEFAULT 'PENDING_PROFILE',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profileSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "roleRequestedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "name" SET NOT NULL;

-- DropTable
DROP TABLE "public"."UserRole";

-- DropEnum
DROP TYPE "public"."Role";

-- CreateTable
CREATE TABLE "public"."Centre" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "name" TEXT NOT NULL,
    "street_address" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "status" "public"."CentreStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_associated" TIMESTAMP(3) NOT NULL,
    "date_left" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Centre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Classroom" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "centre_id" TEXT NOT NULL,
    "section_code" "public"."SectionCode" NOT NULL,
    "timing" "public"."ClassTiming" NOT NULL,
    "monthly_allowance" INTEGER NOT NULL,
    "status" "public"."ClassroomStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_created" TIMESTAMP(3) NOT NULL,
    "date_closed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" "public"."RoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRoleHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenType" TEXT,
    "scope" TEXT,
    "expiresAt" INTEGER,
    "idToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRoles" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilitatorAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacilitatorEmployee" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "employeeUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitatorEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TutorAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aadhaarNo" TEXT,
    "rollNo" TEXT NOT NULL,
    "gender" "public"."Gender",
    "dob" TIMESTAMP(3),
    "street_address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" VARCHAR(10),
    "fatherName" TEXT,
    "motherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentClassroomAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL,
    "leave_date" TIMESTAMP(3),
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClassroomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlyClassroomAttendance" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalStudentsEnrolled" INTEGER NOT NULL,
    "openDays" INTEGER NOT NULL,
    "totalPresent" INTEGER NOT NULL,
    "attendancePercentage" DECIMAL(5,2) NOT NULL,
    "register_photo_url" TEXT,
    "remarks" TEXT,
    "enteredByTutorId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyClassroomAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Centre_code_key" ON "public"."Centre"("code");

-- CreateIndex
CREATE INDEX "Centre_city_state_idx" ON "public"."Centre"("city", "state");

-- CreateIndex
CREATE INDEX "Centre_status_idx" ON "public"."Centre"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "public"."Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_centre_id_idx" ON "public"."Classroom"("centre_id");

-- CreateIndex
CREATE INDEX "Classroom_status_section_code_timing_idx" ON "public"."Classroom"("status", "section_code", "timing");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE INDEX "UserRoleHistory_userId_startDate_idx" ON "public"."UserRoleHistory"("userId", "startDate");

-- CreateIndex
CREATE INDEX "UserRoleHistory_userId_endDate_idx" ON "public"."UserRoleHistory"("userId", "endDate");

-- CreateIndex
CREATE INDEX "UserRoleHistory_roleId_idx" ON "public"."UserRoleHistory"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCredential_userId_key" ON "public"."EmailCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCredential_email_key" ON "public"."EmailCredential"("email");

-- CreateIndex
CREATE INDEX "EmailCredential_email_idx" ON "public"."EmailCredential"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "RoleRequest_userId_status_idx" ON "public"."RoleRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_userId_idx" ON "public"."FacilitatorAssignment"("userId");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_centreId_startDate_endDate_idx" ON "public"."FacilitatorAssignment"("centreId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "FacilitatorEmployee_facilitatorId_idx" ON "public"."FacilitatorEmployee"("facilitatorId");

-- CreateIndex
CREATE INDEX "FacilitatorEmployee_employeeUserId_idx" ON "public"."FacilitatorEmployee"("employeeUserId");

-- CreateIndex
CREATE INDEX "TutorAssignment_userId_idx" ON "public"."TutorAssignment"("userId");

-- CreateIndex
CREATE INDEX "TutorAssignment_classroomId_startDate_endDate_idx" ON "public"."TutorAssignment"("classroomId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "TutorAssignment_isSubstitute_idx" ON "public"."TutorAssignment"("isSubstitute");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "public"."Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_aadhaar_unique" ON "public"."Student"("aadhaarNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNo_key" ON "public"."Student"("rollNo");

-- CreateIndex
CREATE INDEX "Student_city_state_idx" ON "public"."Student"("city", "state");

-- CreateIndex
CREATE INDEX "StudentClassroomAssignment_studentId_status_idx" ON "public"."StudentClassroomAssignment"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentClassroomAssignment_classroomId_join_date_leave_date_idx" ON "public"."StudentClassroomAssignment"("classroomId", "join_date", "leave_date");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_enteredByTutorId_idx" ON "public"."MonthlyClassroomAttendance"("enteredByTutorId");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_year_month_idx" ON "public"."MonthlyClassroomAttendance"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyClassroomAttendance_classroomId_year_month_key" ON "public"."MonthlyClassroomAttendance"("classroomId", "year", "month");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_onboardingStatus_idx" ON "public"."User"("onboardingStatus");

-- AddForeignKey
ALTER TABLE "public"."Classroom" ADD CONSTRAINT "Classroom_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "public"."Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRoleHistory" ADD CONSTRAINT "UserRoleHistory_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailCredential" ADD CONSTRAINT "EmailCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleRequest" ADD CONSTRAINT "RoleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilitatorAssignment" ADD CONSTRAINT "FacilitatorAssignment_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "public"."Centre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilitatorEmployee" ADD CONSTRAINT "FacilitatorEmployee_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacilitatorEmployee" ADD CONSTRAINT "FacilitatorEmployee_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TutorAssignment" ADD CONSTRAINT "TutorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TutorAssignment" ADD CONSTRAINT "TutorAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "public"."Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentClassroomAssignment" ADD CONSTRAINT "StudentClassroomAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentClassroomAssignment" ADD CONSTRAINT "StudentClassroomAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "public"."Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyClassroomAttendance" ADD CONSTRAINT "MonthlyClassroomAttendance_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "public"."Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyClassroomAttendance" ADD CONSTRAINT "MonthlyClassroomAttendance_enteredByTutorId_fkey" FOREIGN KEY ("enteredByTutorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "user_role_active_unique" ON "UserRoleHistory"("userId","roleId") WHERE "endDate" IS NULL;

ALTER TABLE "UserRoleHistory" ADD CONSTRAINT "user_role_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
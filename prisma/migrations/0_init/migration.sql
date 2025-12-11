-- CreateEnum
CREATE TYPE "CentreStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClassroomStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SectionCode" AS ENUM ('JR', 'SR', 'BOTH');

-- CreateEnum
CREATE TYPE "ClassTiming" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F', 'O');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('PENDING', 'ADMIN', 'TUTOR', 'FACILITATOR', 'RELF_EMPLOYEE', 'TUTOR_OF_TUTOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING_PROFILE', 'SUBMITTED_PROFILE', 'PENDING_ROLE', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('ANNUAL', 'INTERN', 'HONORARY', 'LIFE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KPIValueSource" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "KPIUnit" AS ENUM ('COUNT', 'PERCENT', 'LAKHS');

-- CreateTable
CREATE TABLE "Centre" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "name" TEXT,
    "street_address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" VARCHAR(10),
    "status" "CentreStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_associated" TIMESTAMP(3) NOT NULL,
    "date_left" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Centre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentreCodeCounter" (
    "state" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,

    CONSTRAINT "CentreCodeCounter_pkey" PRIMARY KEY ("state")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(24),
    "centre_id" TEXT NOT NULL,
    "section_code" "SectionCode",
    "timing" "ClassTiming",
    "monthly_allowance" INTEGER,
    "status" "ClassroomStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_created" TIMESTAMP(3),
    "date_closed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "pincode" VARCHAR(10),
    "state" TEXT,
    "street_address" TEXT,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomCodeCounter" (
    "key" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,

    CONSTRAINT "ClassroomCodeCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "address" TEXT,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING_PROFILE',
    "phone" TEXT,
    "profileSubmittedAt" TIMESTAMP(3),
    "roleRequestedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "sessionVersion" INTEGER DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCredential" (
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
CREATE TABLE "Account" (
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
CREATE TABLE "RoleRequest" (
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
CREATE TABLE "FacilitatorAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitatorEmployee" (
    "id" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "employeeUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitatorEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorAssignment" (
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
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

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
    "pan" VARCHAR(10),

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

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aadhaarNo" TEXT,
    "rollNo" TEXT NOT NULL,
    "gender" "Gender",
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
CREATE TABLE "StudentClassroomAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL,
    "leave_date" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClassroomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyClassroomAttendance" (
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

-- CreateTable
CREATE TABLE "donation" (
    "id" TEXT NOT NULL,
    "pan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counter" (
    "financialYear" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,

    CONSTRAINT "counter_pkey" PRIMARY KEY ("financialYear")
);

-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" "KPIUnit" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIMonthlyValue" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "KPIValueSource" NOT NULL,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIMonthlyValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIFiscalTarget" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "fiscalLabel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIFiscalTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipCertificate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "dateIssued" TIMESTAMP(3) NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Centre_code_key" ON "Centre"("code");

-- CreateIndex
CREATE INDEX "Centre_city_state_idx" ON "Centre"("city", "state");

-- CreateIndex
CREATE INDEX "Centre_status_idx" ON "Centre"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "Classroom_centre_id_idx" ON "Classroom"("centre_id");

-- CreateIndex
CREATE INDEX "Classroom_status_section_code_timing_idx" ON "Classroom"("status", "section_code", "timing");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_onboardingStatus_idx" ON "User"("onboardingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "UserRoleHistory_userId_startDate_idx" ON "UserRoleHistory"("userId", "startDate");

-- CreateIndex
CREATE INDEX "UserRoleHistory_userId_endDate_idx" ON "UserRoleHistory"("userId", "endDate");

-- CreateIndex
CREATE INDEX "UserRoleHistory_roleId_idx" ON "UserRoleHistory"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCredential_userId_key" ON "EmailCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCredential_email_key" ON "EmailCredential"("email");

-- CreateIndex
CREATE INDEX "EmailCredential_email_idx" ON "EmailCredential"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "RoleRequest_userId_status_idx" ON "RoleRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_userId_idx" ON "FacilitatorAssignment"("userId");

-- CreateIndex
CREATE INDEX "FacilitatorAssignment_centreId_startDate_endDate_idx" ON "FacilitatorAssignment"("centreId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "FacilitatorEmployee_facilitatorId_idx" ON "FacilitatorEmployee"("facilitatorId");

-- CreateIndex
CREATE INDEX "FacilitatorEmployee_employeeUserId_idx" ON "FacilitatorEmployee"("employeeUserId");

-- CreateIndex
CREATE INDEX "TutorAssignment_userId_idx" ON "TutorAssignment"("userId");

-- CreateIndex
CREATE INDEX "TutorAssignment_classroomId_startDate_endDate_idx" ON "TutorAssignment"("classroomId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "TutorAssignment_isSubstitute_idx" ON "TutorAssignment"("isSubstitute");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

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

-- CreateIndex
CREATE UNIQUE INDEX "student_aadhaar_unique" ON "Student"("aadhaarNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNo_key" ON "Student"("rollNo");

-- CreateIndex
CREATE INDEX "Student_city_state_idx" ON "Student"("city", "state");

-- CreateIndex
CREATE INDEX "StudentClassroomAssignment_studentId_status_idx" ON "StudentClassroomAssignment"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentClassroomAssignment_classroomId_join_date_leave_date_idx" ON "StudentClassroomAssignment"("classroomId", "join_date", "leave_date");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_enteredByTutorId_idx" ON "MonthlyClassroomAttendance"("enteredByTutorId");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_year_month_idx" ON "MonthlyClassroomAttendance"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyClassroomAttendance_classroomId_year_month_key" ON "MonthlyClassroomAttendance"("classroomId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "donation_receiptNumber_key" ON "donation"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "donation_transactionId_key" ON "donation"("transactionId");

-- CreateIndex
CREATE INDEX "donation_date_idx" ON "donation"("date");

-- CreateIndex
CREATE INDEX "donation_email_idx" ON "donation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KPI_key_key" ON "KPI"("key");

-- CreateIndex
CREATE UNIQUE INDEX "KPIMonthlyValue_kpiId_month_source_key" ON "KPIMonthlyValue"("kpiId", "month", "source");

-- CreateIndex
CREATE UNIQUE INDEX "KPIFiscalTarget_kpiId_fiscalLabel_key" ON "KPIFiscalTarget"("kpiId", "fiscalLabel");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipCertificate_certificateNo_key" ON "MembershipCertificate"("certificateNo");

-- CreateIndex
CREATE INDEX "MembershipCertificate_name_idx" ON "MembershipCertificate"("name");

-- CreateIndex
CREATE INDEX "MembershipCertificate_year_idx" ON "MembershipCertificate"("year");

-- CreateIndex
CREATE INDEX "MembershipCertificate_dateIssued_idx" ON "MembershipCertificate"("dateIssued");


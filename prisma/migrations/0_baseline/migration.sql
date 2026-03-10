-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "InternStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED', 'PENDING_START');

-- CreateEnum
CREATE TYPE "WorkingMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'WAIVED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('PARTICIPATION', 'INTERNSHIP', 'TRAINING');

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
CREATE TYPE "MemberType" AS ENUM ('ANNUAL', 'INTERN', 'HONORARY', 'LIFE', 'FOUNDER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KPIValueSource" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "KPIUnit" AS ENUM ('COUNT', 'PERCENT', 'LAKHS');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

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
    "gender" "Gender",

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
    "memberId" TEXT,
    "isGoverningBody" BOOLEAN NOT NULL DEFAULT false,

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
    "joiningDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "preferredHoursPerDay" TEXT,
    "workingMode" "WorkingMode",
    "associatedAfter" BOOLEAN DEFAULT false,
    "comments" TEXT,
    "status" "InternStatus" DEFAULT 'ACTIVE',
    "feeAmount" INTEGER,
    "feePaidDate" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" DEFAULT 'PENDING',
    "memberId" TEXT,

    CONSTRAINT "Intern_pkey" PRIMARY KEY ("id")
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
    "totalStudentsEnrolled" INTEGER,
    "openDays" INTEGER,
    "totalPresent" INTEGER,
    "attendancePercentage" DECIMAL(5,2),
    "register_photo_url" TEXT,
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "entered_by_id" TEXT,
    "tutor_phone" TEXT,

    CONSTRAINT "MonthlyClassroomAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("year")
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

-- CreateTable
CREATE TABLE "ParticipationCertificate" (
    "id" TEXT NOT NULL,
    "certificateNo" TEXT,
    "name" TEXT NOT NULL,
    "aadhaar" TEXT,
    "classYear" TEXT,
    "institute" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventName" TEXT,
    "type" "CertificateType" NOT NULL DEFAULT 'PARTICIPATION',

    CONSTRAINT "ParticipationCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ONGOING',
    "conclusion" TEXT,
    "nextSteps" TEXT,
    "mentors" TEXT,
    "sponsoredBy" TEXT,
    "year" TEXT,
    "funds" DECIMAL(10,2),
    "place" TEXT,
    "targetGroup" TEXT,
    "beneficiaries" TEXT,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalUrl" TEXT,
    "proposalUrl" TEXT,
    "rating" INTEGER DEFAULT 0,
    "utilizationUrl" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GstReceipt" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dateOfSupply" TEXT,
    "placeOfSupply" TEXT,
    "reverseCharge" TEXT DEFAULT 'N',
    "billToName" TEXT NOT NULL,
    "billToGstin" TEXT DEFAULT 'NA',
    "billToState" TEXT NOT NULL DEFAULT 'Jharkhand',
    "billToCode" TEXT DEFAULT '20',
    "shipToName" TEXT,
    "shipToGstin" TEXT DEFAULT 'NA',
    "shipToState" TEXT DEFAULT 'Jharkhand',
    "shipToCode" TEXT DEFAULT '20',
    "items" JSONB,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GstReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "projectName" TEXT,
    "expenditureHead" TEXT,
    "payeeName" TEXT NOT NULL,
    "payeeMobile" TEXT,
    "items" JSONB,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "paymentMode" TEXT,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "id" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "currentSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSequence" (
    "id" TEXT NOT NULL DEFAULT 'member_seq',
    "current" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyStatement" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "dataPopulatedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "startBalance" DECIMAL(15,2),
    "endBalance" DECIMAL(15,2),
    "statementFileUrl" TEXT,
    "financialYearId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txnDate" TIMESTAMP(3),
    "valueDate" TIMESTAMP(3),
    "description" TEXT,
    "txnId" TEXT,
    "refNo" TEXT,
    "branchCode" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2),
    "runningBalance" DECIMAL(15,2),
    "partyName" TEXT,
    "reason" TEXT,
    "statementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Member_memberId_key" ON "Member"("memberId");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_memberType_idx" ON "Member"("memberType");

-- CreateIndex
CREATE INDEX "Member_isGoverningBody_idx" ON "Member"("isGoverningBody");

-- CreateIndex
CREATE INDEX "MemberFee_fiscalLabel_idx" ON "MemberFee"("fiscalLabel");

-- CreateIndex
CREATE UNIQUE INDEX "MemberFee_memberId_fiscalLabel_key" ON "MemberFee"("memberId", "fiscalLabel");

-- CreateIndex
CREATE INDEX "MemberTypeHistory_memberId_idx" ON "MemberTypeHistory"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Intern_memberId_key" ON "Intern"("memberId");

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
CREATE INDEX "MonthlyClassroomAttendance_classroomId_year_idx" ON "MonthlyClassroomAttendance"("classroomId", "year");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_year_month_idx" ON "MonthlyClassroomAttendance"("year", "month");

-- CreateIndex
CREATE INDEX "MonthlyClassroomAttendance_entered_by_id_idx" ON "MonthlyClassroomAttendance"("entered_by_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationCertificate_certificateNo_key" ON "ParticipationCertificate"("certificateNo");

-- CreateIndex
CREATE INDEX "ParticipationCertificate_name_idx" ON "ParticipationCertificate"("name");

-- CreateIndex
CREATE INDEX "ParticipationCertificate_aadhaar_idx" ON "ParticipationCertificate"("aadhaar");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_year_idx" ON "Project"("year");

-- CreateIndex
CREATE UNIQUE INDEX "GstReceipt_invoiceNo_key" ON "GstReceipt"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_voucherNo_key" ON "PaymentVoucher"("voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCounter_financialYear_key" ON "InvoiceCounter"("financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_name_key" ON "FinancialYear"("name");

-- CreateIndex
CREATE INDEX "MonthlyStatement_financialYearId_idx" ON "MonthlyStatement"("financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyStatement_month_year_key" ON "MonthlyStatement"("month", "year");

-- CreateIndex
CREATE INDEX "Transaction_statementId_idx" ON "Transaction"("statementId");

-- CreateIndex
CREATE INDEX "Transaction_txnDate_idx" ON "Transaction"("txnDate");


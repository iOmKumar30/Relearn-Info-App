import { generateNextMemberId } from "@/libs/idGenerator";
import {
  assertInternPaymentTokenConfiguration,
  createInternPaymentActivationToken,
  INTERN_PAYMENT_AMOUNT_RUPEES,
} from "@/libs/intern-payment";
import {
  INTERN_TEMPORARY_PASSWORD,
  InternUserConflictError,
} from "@/libs/intern-user";
import prisma from "@/libs/prismadb";
import { verifyTurnstile } from "@/libs/turnstile";
import {
  Gender,
  InternStatus,
  MemberStatus,
  MemberType,
  OnboardingStatus,
  Prisma,
  RoleName,
  UserStatus,
  WorkingMode,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ValidationError extends Error {}
class DuplicateRegistrationError extends Error {}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ValidationError("Invalid text field");

  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new ValidationError("Text field is too long");
  return trimmed || null;
}

function optionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("Invalid date");

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new ValidationError("Invalid date");
  return date;
}

function invalidRequest(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return invalidRequest("The submitted form is too large.", 413);
  }

  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  try {
    // Validate this before writing the registration: every successful public
    // registration must be able to continue into the protected payment flow.
    assertInternPaymentTokenConfiguration();
    const body = await request.json();
    const turnstileToken = typeof body?.cfToken === "string" ? body.cfToken : "";

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) {
      console.warn("INTERN_REGISTRATION_REJECTED", {
        reason: "turnstile_failed",
        ip,
        userAgent,
      });
      return invalidRequest("Verification failed. Please try again.", 403);
    }

    const name = optionalString(body?.name, 120);
    const email = optionalString(body?.email, 254)?.toLowerCase() ?? null;
    const mobile = optionalString(body?.mobile, 30);
    const address = optionalString(body?.address, 1_000);
    const institution = optionalString(body?.institution, 200);
    const previousInstitute = optionalString(body?.previousInstitute, 200) ?? "";
    const educationCompleted = optionalString(body?.educationCompleted, 200);
    const ongoingCourse = optionalString(body?.ongoingCourse, 200);
    const areasOfInterest = optionalString(body?.areasOfInterest, 500);
    const preferredHoursPerDay = optionalString(body?.preferredHoursPerDay, 100);
    const dateOfBirth = optionalDate(body?.dateOfBirth);
    const joiningDate = optionalDate(body?.joiningDate);

    if (!name || !email || !mobile || !EMAIL_PATTERN.test(email)) {
      return invalidRequest("Name, a valid email address, and mobile number are required.");
    }

    if (dateOfBirth && dateOfBirth > new Date()) {
      return invalidRequest("Date of birth cannot be in the future.");
    }

    const gender = body?.gender;
    if (gender !== undefined && gender !== "" && !Object.values(Gender).includes(gender)) {
      return invalidRequest("Invalid gender selection.");
    }

    const workingMode = body?.workingMode;
    if (
      workingMode !== undefined &&
      workingMode !== "" &&
      !Object.values(WorkingMode).includes(workingMode)
    ) {
      return invalidRequest("Invalid working mode selection.");
    }

    if (typeof body?.associatedAfter !== "boolean" && body?.associatedAfter !== undefined) {
      return invalidRequest("Invalid future association selection.");
    }

    // Hashing is intentionally outside the database transaction. It is CPU
    // bound and does not need a database lock; the nested writes below remain
    // one atomic transaction.
    const [memberRole, passwordHash] = await Promise.all([
      prisma.role.upsert({
        where: { name: RoleName.MEMBER },
        update: {},
        create: {
          name: RoleName.MEMBER,
          description: "Members, including interns",
        },
        select: { id: true },
      }),
      bcrypt.hash(INTERN_TEMPORARY_PASSWORD, 10),
    ]);

    const intern = await prisma.$transaction(
      async (tx) => {
        const [duplicateIntern, existingUser] = await Promise.all([
          tx.intern.findFirst({
            where: {
              OR: [
                { email: { equals: email, mode: "insensitive" } },
                { mobile },
              ],
            },
            select: { id: true },
          }),
          tx.user.findUnique({ where: { email }, select: { id: true } }),
        ]);
        if (duplicateIntern) throw new DuplicateRegistrationError();
        if (existingUser) throw new InternUserConflictError();

        const memberId = await generateNextMemberId(tx, "INTERN");
        return tx.intern.create({
          data: {
            memberId,
            name,
            email,
            mobile,
            address,
            gender: gender || null,
            dateOfBirth,
            institution,
            previousInstitute,
            educationCompleted,
            ongoingCourse,
            areasOfInterest,
            preferredHoursPerDay,
            workingMode: workingMode || null,
            associatedAfter: body?.associatedAfter ?? false,
            joiningDate,
            status: InternStatus.PENDING_START,
            feeAmount: INTERN_PAYMENT_AMOUNT_RUPEES,
            user: {
              create: {
                name,
                email,
                phone: mobile,
                address,
                gender: gender || null,
                status: UserStatus.ACTIVE,
                onboardingStatus: OnboardingStatus.ACTIVE,
                activatedAt: new Date(),
                emailCredential: { create: { email, passwordHash } },
                roleHistory: { create: { roleId: memberRole.id } },
                member: {
                  create: {
                    memberId,
                    memberType: MemberType.INTERN,
                    joiningDate: joiningDate ?? new Date(),
                    status: MemberStatus.ACTIVE,
                    typeHistory: {
                      create: { memberType: MemberType.INTERN },
                    },
                  },
                },
              },
            },
          },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    console.info("INTERN_REGISTRATION_ACCEPTED", {
      internId: intern.id,
      ip,
      userAgent,
    });

    return NextResponse.json(
      {
        message: "Your internship registration has been submitted successfully.",
        paymentToken: createInternPaymentActivationToken(intern.id),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DuplicateRegistrationError) {
      console.warn("INTERN_REGISTRATION_REJECTED", {
        reason: "duplicate_contact",
        ip,
        userAgent,
      });
      return invalidRequest(
        "A registration already exists for the supplied contact details.",
        409,
      );
    }

    if (error instanceof InternUserConflictError) {
      return invalidRequest(
        "A user account already exists for the supplied email address.",
        409,
      );
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return invalidRequest(
        "A registration already exists for the supplied contact details.",
        409,
      );
    }

    if (error instanceof ValidationError) {
      return invalidRequest("Please check the form fields and try again.");
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      return invalidRequest("This registration is already being processed. Please try again.", 409);
    }

    console.error("INTERN_REGISTRATION_ERROR", {
      error: error instanceof Error ? error.message : "Unknown error",
      ip,
      userAgent,
    });
    return invalidRequest("Unable to submit the registration. Please try again later.", 500);
  }
}

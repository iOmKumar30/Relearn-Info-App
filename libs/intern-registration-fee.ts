import { DEFAULT_MEMBER_FEES } from "@/libs/memberConstants";
import prisma from "@/libs/prismadb";
import { Prisma } from "@prisma/client";

export const INTERN_REGISTRATION_SETTINGS_ID = "default";
export const DEFAULT_INTERN_REGISTRATION_FEE = DEFAULT_MEMBER_FEES.INTERN;
const MAX_INTERN_REGISTRATION_FEE = 1_000_000;

function isMissingSettingsTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export function isValidInternRegistrationFee(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_INTERN_REGISTRATION_FEE
  );
}

/**
 * Resolves the fee for a new public registration. The fallback preserves the
 * existing ₹1400 behaviour until the additive settings migration is applied.
 */
export async function getInternRegistrationFee(): Promise<number> {
  try {
    const settings = await prisma.internRegistrationSettings.findUnique({
      where: { id: INTERN_REGISTRATION_SETTINGS_ID },
      select: { registrationFee: true },
    });

    return isValidInternRegistrationFee(settings?.registrationFee)
      ? settings.registrationFee
      : DEFAULT_INTERN_REGISTRATION_FEE;
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      console.error(
        "INTERN_REGISTRATION_SETTINGS_TABLE_MISSING: apply Prisma migrations before configuring the registration fee.",
      );
      return DEFAULT_INTERN_REGISTRATION_FEE;
    }
    throw error;
  }
}

export async function setInternRegistrationFee(
  registrationFee: number,
): Promise<number> {
  if (!isValidInternRegistrationFee(registrationFee)) {
    throw new Error("Invalid intern registration fee");
  }

  const settings = await prisma.internRegistrationSettings.upsert({
    where: { id: INTERN_REGISTRATION_SETTINGS_ID },
    create: { id: INTERN_REGISTRATION_SETTINGS_ID, registrationFee },
    update: { registrationFee },
    select: { registrationFee: true },
  });

  return settings.registrationFee;
}

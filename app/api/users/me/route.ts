import { authOptions } from "@/libs/authOptions";
import prisma from "@/libs/prismadb";
import { Gender, Prisma, UserStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 24;
const MAX_ADDRESS_LENGTH = 500;
const MAX_EMAIL_LENGTH = 254;

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function validEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const uploadthingHost = ["ufs.sh", "utfs.io", "uploadthing.com"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    return url.protocol === "https:" && uploadthingHost;
  } catch {
    return false;
  }
}

async function currentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      gender: true,
      avatarUrl: true,
      status: true,
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
      emailCredential: { select: { id: true } },
      accounts: { select: { provider: true } },
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    return new NextResponse("Profile unavailable", { status: 403 });
  }

  const hasOAuthAccount = user.accounts.length > 0;
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    gender: user.gender,
    avatarUrl: user.avatarUrl,
    roles: user.roleHistory.map((history) => history.role.name),
    hasPassword: Boolean(user.emailCredential),
    canChangeEmail: Boolean(user.emailCredential) && !hasOAuthAccount,
    emailManagedBy: hasOAuthAccount ? user.accounts.map((account) => account.provider) : [],
  });
}

export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new NextResponse("Invalid profile data", { status: 400 });
  }

  const name = optionalText((body as Record<string, unknown>).name, MAX_NAME_LENGTH);
  if (!name) return new NextResponse("Name is required", { status: 400 });

  const phone = optionalText((body as Record<string, unknown>).phone, MAX_PHONE_LENGTH);
  const address = optionalText((body as Record<string, unknown>).address, MAX_ADDRESS_LENGTH);
  const rawGender = (body as Record<string, unknown>).gender;
  const gender = rawGender === undefined
    ? undefined
    : rawGender === null || rawGender === ""
      ? null
      : typeof rawGender === "string" && Object.values(Gender).includes(rawGender as Gender)
        ? (rawGender as Gender)
        : undefined;
  if (rawGender !== undefined && gender === undefined) {
    return new NextResponse("Invalid gender", { status: 400 });
  }

  const rawAvatarUrl = (body as Record<string, unknown>).avatarUrl;
  const avatarUrl = rawAvatarUrl === undefined
    ? undefined
    : rawAvatarUrl === null || rawAvatarUrl === ""
      ? null
      : typeof rawAvatarUrl === "string" && validAvatarUrl(rawAvatarUrl)
        ? rawAvatarUrl
        : undefined;
  if (rawAvatarUrl !== undefined && avatarUrl === undefined) {
    return new NextResponse("Invalid profile photo", { status: 400 });
  }

  const rawEmail = (body as Record<string, unknown>).email;
  if (typeof rawEmail !== "string") {
    return new NextResponse("Email is required", { status: 400 });
  }
  const email = rawEmail.trim().toLowerCase();
  if (!validEmail(email)) return new NextResponse("Invalid email address", { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          status: true,
          emailCredential: { select: { id: true } },
          accounts: { select: { provider: true } },
        },
      });
      if (!existing || existing.status !== UserStatus.ACTIVE) {
        throw new Error("PROFILE_UNAVAILABLE");
      }

      const emailChanged = existing.email !== email;
      if (emailChanged && (!existing.emailCredential || existing.accounts.length > 0)) {
        throw new Error("EMAIL_MANAGED_BY_PROVIDER");
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          name,
          phone,
          address,
          gender,
          avatarUrl,
          ...(emailChanged
            ? {
                email,
                emailCredential: { update: { email } },
              }
            : {}),
        },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
          gender: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new NextResponse("This email address is already in use", { status: 409 });
    }
    if (error instanceof Error && error.message === "EMAIL_MANAGED_BY_PROVIDER") {
      return new NextResponse("Email is managed by your sign-in provider", { status: 400 });
    }
    if (error instanceof Error && error.message === "PROFILE_UNAVAILABLE") {
      return new NextResponse("Profile unavailable", { status: 403 });
    }
    console.error("SELF_SERVICE_PROFILE_UPDATE_ERROR", { userId, error });
    return new NextResponse("Unable to update profile", { status: 500 });
  }
}

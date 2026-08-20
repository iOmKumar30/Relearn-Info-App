import {
  Gender,
  MemberStatus,
  MemberType,
  OnboardingStatus,
  Prisma,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

export const INTERN_TEMPORARY_PASSWORD = "WelcomeToRelf";

export class InternUserConflictError extends Error {}

type TransactionClient = Prisma.TransactionClient;

type InternUserProfile = {
  name: string;
  email: string;
  memberId: string;
  joiningDate?: Date | null;
  changedBy?: string | null;
  mobile?: string | null;
  address?: string | null;
  gender?: Gender | null;
};

export async function createUserForIntern(
  tx: TransactionClient,
  profile: InternUserProfile,
) {
  const email = profile.email.trim().toLowerCase();
  const existingUser = await tx.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) throw new InternUserConflictError();

  const memberRole = await tx.role.upsert({
    where: { name: RoleName.MEMBER },
    update: {},
    create: {
      name: RoleName.MEMBER,
      description: "Members, including interns",
    },
    select: { id: true },
  });

  const passwordHash = await bcrypt.hash(INTERN_TEMPORARY_PASSWORD, 10);
  const user = await tx.user.create({
    data: {
      name: profile.name,
      email,
      phone: profile.mobile ?? null,
      address: profile.address ?? null,
      gender: profile.gender ?? null,
      status: UserStatus.ACTIVE,
      onboardingStatus: OnboardingStatus.ACTIVE,
      activatedAt: new Date(),
      emailCredential: { create: { email, passwordHash } },
    },
    select: { id: true },
  });

  await tx.userRoleHistory.create({
    data: {
      userId: user.id,
      roleId: memberRole.id,
      startDate: new Date(),
    },
  });

  const member = await tx.member.create({
    data: {
      userId: user.id,
      memberId: profile.memberId,
      memberType: MemberType.INTERN,
      joiningDate: profile.joiningDate ?? new Date(),
      status: MemberStatus.ACTIVE,
    },
    select: { id: true },
  });

  await tx.memberTypeHistory.create({
    data: {
      memberId: member.id,
      memberType: MemberType.INTERN,
      startDate: new Date(),
      changedBy: profile.changedBy ?? null,
    },
  });

  return user;
}

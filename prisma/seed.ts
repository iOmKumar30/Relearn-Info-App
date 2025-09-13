import {
  OnboardingStatus,
  PrismaClient,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "123123";
  const ADMIN_NAME = "Admin User";

  const requiredRoles: RoleName[] = [
    "ADMIN",
    "FACILITATOR",
    "TUTOR",
    "RELF_EMPLOYEE",
    "PENDING",
  ];

  const existingRoles = await prisma.role.findMany({
    where: { name: { in: requiredRoles } },
    select: { name: true },
  });
  const existingSet = new Set(existingRoles.map((r) => r.name));

  for (const rn of requiredRoles) {
    if (!existingSet.has(rn)) {
      await prisma.role.create({
        data: {
          name: rn,
          description:
            rn === "PENDING" ? "Awaiting admin role assignment" : `${rn} role`,
        },
      });
    }
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  let user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase(),
        status: UserStatus.ACTIVE,
        onboardingStatus: OnboardingStatus.ACTIVE,
        activatedAt: new Date(),
        emailCredential: {
          create: {
            email: ADMIN_EMAIL.toLowerCase(),
            passwordHash,
          },
        },
      },
      select: { id: true },
    });
  } else {

    const cred = await prisma.emailCredential.findUnique({
      where: { email: ADMIN_EMAIL.toLowerCase() },
      select: { id: true },
    });
    if (!cred) {
      await prisma.emailCredential.create({
        data: {
          email: ADMIN_EMAIL.toLowerCase(),
          passwordHash,
          user: { connect: { id: user.id } },
        },
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        onboardingStatus: OnboardingStatus.ACTIVE,
        activatedAt: new Date(),
        name: ADMIN_NAME,
      },
    });
  }


  const roles = await prisma.role.findMany({
    where: { name: { in: ["ADMIN"] as RoleName[] } },
    select: { id: true, name: true },
  });
  const adminRole = roles.find((r) => r.name === "ADMIN");

  const pending = await prisma.role.findUnique({ where: { name: "PENDING" } });
  if (pending) {
    await prisma.userRoleHistory.updateMany({
      where: { userId: user.id, roleId: pending.id, endDate: null },
      data: { endDate: new Date() },
    });
  }


  if (adminRole) {
    const openAdmin = await prisma.userRoleHistory.findFirst({
      where: { userId: user.id, roleId: adminRole.id, endDate: null },
      select: { id: true },
    });
    if (!openAdmin) {
      await prisma.userRoleHistory.create({
        data: { userId: user.id, roleId: adminRole.id, startDate: new Date() },
      });
    }
  }

  console.log(`Seed complete. Admin: ${ADMIN_EMAIL}`);
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: "a@b.com",
      password: "123123",
      roles: [Role.PENDING],
    },
    {
      email: "c@d.com",
      password: "123123",
      roles: [Role.ROLE1],
    },
    {
      email: "d@e.com",
      password: "123123",
      roles: [Role.ROLE1, Role.ROLE2],
    },
    {
      email: "admin@g.com",
      password: "123123",
      roles: [Role.ADMIN],
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        hashedPassword,
        roles: {
          create: user.roles.map((role) => ({ role })), 
        },
      },
    });
    console.log(`Seeded user: ${createdUser.email}`);
  }
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

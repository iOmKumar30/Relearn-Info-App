import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FOUNDER_EMAILS = [
  "prabal.sen0951@gmail.com",
  "mita.csir@gmail.com",
  "tarafder.rini@gmail.com",
];

async function main() {
  console.log("Starting Member ID Assignment (Robust Order)...");

  let counter = 0;

  // 1. Founders (Manual Fixed Order)
  console.log("\n--- Processing FOUNDERS ---");
  for (const email of FOUNDER_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { member: true },
    });

    if (user && user.member) {
      counter++;
      const memberId = `FM${counter.toString().padStart(4, "0")}`;
      await prisma.member.update({
        where: { id: user.member.id },
        data: { memberId },
      });
      console.log(`assigned ${memberId} to ${user.name}`);
    }
  }

  // 2. Member Types Helper
  const assignForType = async (
    type: "HONORARY" | "LIFE" | "ANNUAL",
    prefix: string
  ) => {
    console.log(`\n--- Processing ${type} MEMBERS ---`);

    const members = await prisma.member.findMany({
      where: {
        memberType: type,
        user: { email: { notIn: FOUNDER_EMAILS } },
      },
      // UPDATED ORDERING LOGIC
      orderBy: [
        { joiningDate: "asc" }, // Nulls usually come last in Prisma/Postgres ASC
        { createdAt: "asc" }, // Fallback for ties or nulls
      ],
      select: { id: true },
    });

    for (const m of members) {
      counter++;
      const memberId = `${prefix}${counter.toString().padStart(4, "0")}`;
      await prisma.member.update({
        where: { id: m.id },
        data: { memberId },
      });
    }
    console.log(`Processed ${members.length} records.`);
  };

  // 3. Execute Order
  await assignForType("HONORARY", "HM");
  await assignForType("LIFE", "LM");
  await assignForType("ANNUAL", "AM");

  // 4. Interns
  console.log("\n--- Processing INTERNS ---");
  const interns = await prisma.intern.findMany({
    // UPDATED ORDERING LOGIC
    orderBy: [{ joiningDate: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  for (const i of interns) {
    counter++;
    const memberId = `IM${counter.toString().padStart(4, "0")}`;
    await prisma.intern.update({
      where: { id: i.id },
      data: { memberId },
    });
  }
  console.log(`Processed ${interns.length} interns.`);

  // 5. Finalize
  await prisma.globalSequence.upsert({
    where: { id: "member_seq" },
    update: { current: counter },
    create: { id: "member_seq", current: counter },
  });

  console.log(`\nDONE. Counter at ${counter}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Ensure this matches your specific Founder enum value if you added one,
// otherwise filter by the specific founder emails if 'FOUNDER' isn't in MemberType enum.
// Assuming MemberType might not have FOUNDER, or you handle them by ID/Email.
// Based on previous chats, Founders might just be handled via the specific IDs/Emails.

const FOUNDER_EMAILS = [
  "prabal.sen0951@gmail.com",
  "mita.csir@gmail.com",
  "tarafder.rini@gmail.com",
];

const DEFAULT_DATE = new Date("1979-01-01");

async function main() {
  console.log("Backfilling Member Type History (Skipping Founders)...");

  // Fetch members, excluding known founders if possible at db level,
  // or filter in loop if easier.
  const members = await prisma.member.findMany({
    include: {
      typeHistory: true,
      user: { select: { email: true } }, // Need email to check for founders
    },
  });

  let count = 0;
  let skipped = 0;

  for (const m of members) {
    // 1. Skip if Founder (by Email check)
    // Note: If you added 'FOUNDER' to MemberType enum, use: if (m.memberType === 'FOUNDER') continue;
    if (m.user?.email && FOUNDER_EMAILS.includes(m.user.email)) {
      skipped++;
      continue;
    }

    // 2. Only create if no history exists
    if (m.typeHistory.length === 0) {
      await prisma.memberTypeHistory.create({
        data: {
          memberId: m.id,
          memberType: m.memberType,
          // Use joiningDate or fallback to 1979
          startDate: m.joiningDate ? m.joiningDate : DEFAULT_DATE,
          endDate: null, // Active
        },
      });
      count++;
      process.stdout.write(".");
    }
  }

  console.log(`\nDone.`);
  console.log(`Created history for: ${count} members.`);
  console.log(`Skipped (Founders/Existing): ${skipped} members.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

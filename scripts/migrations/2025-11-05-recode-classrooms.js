// scripts/migrations/2025-11-05-recode-classrooms-global.js
// Rewrites classroom.code to CENTRECODE-NN with a global NN by createdAt ascending.

require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function backfill() {
  console.log("Loading centres...");
  const centres = await prisma.centre.findMany({
    select: { id: true, code: true },
  });
  const centreCodes = new Map(centres.map((c) => [c.id, c.code]));

  console.log("Loading classrooms (global ordering)...");
  const classrooms = await prisma.classroom.findMany({
    select: { id: true, centreId: true, code: true, createdAt: true },
    orderBy: { createdAt: "asc" }, // global order
  });

  const updates = [];
  let seq = 0;

  console.log("Computing new codes...");
  for (const cls of classrooms) {
    const centreCode = centreCodes.get(cls.centreId);
    if (!centreCode) {
      console.warn("Skipping classroom missing centre code", {
        classroomId: cls.id,
        centreId: cls.centreId,
      });
      continue;
    }
    seq += 1;
    const serial = String(seq).padStart(2, "0");
    const newCode = `${centreCode}-${serial}`;
    if (newCode !== cls.code) {
      updates.push({ id: cls.id, code: newCode });
    }
  }

  // Collision guard (paranoia)
  const seen = new Set();
  for (const u of updates) {
    if (seen.has(u.code)) {
      throw new Error(`Collision detected for classroom code ${u.code}`);
    }
    seen.add(u.code);
  }

  console.log(`Applying ${updates.length} updates in batches...`);
  const BATCH = 200;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((u) =>
        prisma.classroom.update({
          where: { id: u.id },
          data: { code: u.code },
        })
      )
    );
    console.log(
      `Updated ${Math.min(i + BATCH, updates.length)} / ${updates.length}`
    );
  }

  // Sync the runtime counter to the max sequence used
  console.log("Syncing global counter...");
  await prisma.classroomCodeCounter.upsert({
    where: { key: "GLOBAL" },
    update: { seq },
    create: { key: "GLOBAL", seq },
  });

  console.log("Backfill (global) complete. Final seq:", seq);
}

backfill()
  .catch((e) => {
    console.error("Backfill global error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

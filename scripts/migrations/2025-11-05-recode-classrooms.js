// scripts/migrations/2025-11-05-recode-classrooms.js
// Rewrites classroom.code to CENTRECODE-SECTION-SS per (centreId, section)
// - Assumes Centre.code is already migrated (e.g., JH01, WB02)
// - Serial SS starts at 01 and increments by createdAt ascending per (centreId, section)

require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function backfill() {
  console.log("Loading centres...");
  const centres = await prisma.centre.findMany({
    select: { id: true, code: true },
  });
  const centreCodes = new Map(centres.map((c) => [c.id, c.code]));

  console.log("Loading classrooms...");
  const classrooms = await prisma.classroom.findMany({
    select: {
      id: true,
      centreId: true,
      section: true,
      code: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" }, // deterministic ordering
  });

  const updates = [];
  const counters = new Map(); // key = `${centreId}-${section}`

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
    const key = `${cls.centreId}-${cls.section}`;
    const cur = counters.get(key) || 0;
    const next = cur + 1;
    counters.set(key, next);

    const serial = String(next).padStart(2, "0");
    const newCode = `${centreCode}-${cls.section}-${serial}`;

    if (newCode !== cls.code) {
      updates.push({ id: cls.id, code: newCode });
    }
  }

  // Collision guard
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

  console.log("Backfill complete.");
}

backfill()
  .catch((e) => {
    console.error("Backfill error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

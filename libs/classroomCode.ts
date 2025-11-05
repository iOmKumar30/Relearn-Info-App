import { Prisma } from "@prisma/client";

/**
 * Generate classroom code as "CENTRECODE-NN" where NN is a global serial
 * shared across all classrooms (01, 02, 03, ...).
 */
export async function generateClassroomCode(
  tx: Prisma.TransactionClient,
  centreId: string
) {
  // 1) Fetch centre code
  const centre = await tx.centre.findUnique({
    where: { id: centreId },
    select: { code: true },
  });
  if (!centre?.code) throw new Error("Centre not found or missing code");

  // 2) Increment global counter atomically
  const row = await tx.classroomCodeCounter.upsert({
    where: { key: "GLOBAL" },
    update: { seq: { increment: 1 } },
    create: { key: "GLOBAL", seq: 1 },
    select: { seq: true },
  });

  const serial = String(row.seq).padStart(2, "0");
  return `${centre.code}-${serial}`;
}

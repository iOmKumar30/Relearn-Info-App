import { Prisma, SectionCode } from "@prisma/client";

/**
 * Generate classroom code as "CENTRECODE-SECTION-SS".
 * - CENTRECODE: the full Centre.code, e.g., "JH01"
 * - SECTION: "JR" or "SR"
 * - SS: 2-digit serial per (centreId, section), starting at "01"
 */
export async function generateClassroomCode(
  tx: Prisma.TransactionClient,
  centreId: string,
  section: SectionCode
) {
  // 1) Fetch centre code once
  const centre = await tx.centre.findUnique({
    where: { id: centreId },
    select: { code: true },
  });
  if (!centre?.code) throw new Error("Centre not found or missing code");

  const prefix = `${centre.code}-${section}-`; // e.g., "JH01-JR-"

  // 2) Find highest existing serial for this centre+section by matching prefix
  const last = await tx.classroom.findFirst({
    where: {
      centreId,
      section,
      code: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" }, // stable; if you store serial in code, createdAt usually correlates
    select: { code: true },
  });

  let nextSerial = 1;
  if (last?.code) {
    const serialStr = last.code.substring(prefix.length); // tail after "JH01-JR-"
    const n = parseInt(serialStr, 10);
    if (!isNaN(n)) nextSerial = n + 1;
  }

  const serial = String(nextSerial).padStart(2, "0");
  return `${prefix}${serial}`; // e.g., "JH01-JR-03"
}

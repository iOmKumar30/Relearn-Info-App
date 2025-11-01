// Compose classroom code as "SNN-SEC-SS"
// - S: first letter of Centre.state (uppercased)
// - NN: numeric part extracted from Centre.code (e.g., SP01 -> 01)
// - SEC: JR | SR
// - SS: serial per (centreId, section), 2-digits starting at 01
import { Prisma, SectionCode } from "@prisma/client";


export async function generateClassroomCode(
  tx: Prisma.TransactionClient,
  centreId: string,
  section: SectionCode
) {
  const centre = await tx.centre.findUnique({
    where: { id: centreId },
    select: { code: true, state: true },
  });
  if (!centre) throw new Error("Centre not found for classroom creation");

  const stateLetter = (centre.state?.trim()?.[0] ?? "X").toUpperCase();

  // Extract trailing digits from centre.code; fallback to "01"
  const centreNum = (() => {
    const m = centre.code.match(/(\d+)\s*$/);
    const n = m ? parseInt(m[1], 10) : 1;
    return String(isNaN(n) ? 1 : n).padStart(2, "0");
  })();

  // Find the max existing serial for this centre+section by parsing code suffix
  const last = await tx.classroom.findFirst({
    where: { centreId, section },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });

  let nextSerial = 1;
  if (last?.code) {
    const parts = last.code.split("-");
    const serialStr = parts[2]; // expect "J01-JR-03" -> "03"
    const n = parseInt(serialStr, 10);
    if (!isNaN(n)) nextSerial = n + 1;
  }
  const serial = String(nextSerial).padStart(2, "0");

  return `${stateLetter}${centreNum}-${section}-${serial}`;
}

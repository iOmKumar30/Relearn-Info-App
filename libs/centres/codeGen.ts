import { STATE_CODES } from "@/libs/geo/stateCodes";
import prisma from "@/libs/prismadb";

function assertStateCode(code: string) {
  if (!STATE_CODES[code as keyof typeof STATE_CODES]) {
    throw new Error(`Invalid state code: ${code}`);
  }
}

export async function nextCentreCodeForState(stateCode: string) {
  const code = stateCode.toUpperCase();
  assertStateCode(code);
  const row = await prisma.centreCodeCounter.upsert({
    where: { state: code },
    update: { seq: { increment: 1 } },
    create: { state: code, seq: 1 },
  });
  const serial = String(row.seq).padStart(2, "0");
  return `${code}${serial}`;
}

// Deterministic formatter if you already know the ordinal number:
export function formatCentreCode(stateCode: string, ordinal: number) {
  assertStateCode(stateCode);
  return `${stateCode.toUpperCase()}${String(ordinal).padStart(2, "0")}`;
}

// Map Enums to Prefixes
export const PREFIX_MAP: Record<string, string> = {
  ANNUAL: "AM",
  LIFE: "LM",
  HONORARY: "HM",
  INTERN: "IM",
  FOUNDER: "FM",
}
/**
 * Generates the next Member ID safely.
 * @param tx - The active Prisma Transaction Client (IMPORTANT: Must be inside a transaction)
 * @param typeKey - 'ANNUAL', 'LIFE', 'INTERN', etc.
 */
export async function generateNextMemberId(tx: any, typeKey: string) {
  // 1. Atomically increment and get the counter
  const seq = await tx.globalSequence.update({
    where: { id: "member_seq" },
    data: { current: { increment: 1 } },
  });

  // 2. Determine Prefix
  const prefix = PREFIX_MAP[typeKey] || "XX";

  // 3. Format
  return `${prefix}${seq.current.toString().padStart(4, "0")}`;
}

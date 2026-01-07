import prisma from "./prismadb";
type Tx = Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => any
  ? T
  : never;
export async function generateClassroomCode(tx: Tx, centreId: string) {
  const centre = await tx.centre.findUnique({
    where: { id: centreId },
    select: { code: true },
  });

  if (!centre?.code) throw new Error("Centre not found or missing code");

  const row = await tx.classroomCodeCounter.upsert({
    where: { key: "GLOBAL" },
    update: { seq: { increment: 1 } },
    create: { key: "GLOBAL", seq: 1 },
    select: { seq: true },
  });

  const serial = String(row.seq).padStart(2, "0");
  return `${centre.code}-${serial}`;
}

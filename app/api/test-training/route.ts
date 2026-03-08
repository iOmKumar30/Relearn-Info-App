import prisma from "@/libs/prismadb";

export async function GET() {
  const classes = await prisma.tutorTrainingClass.findMany({
    where: { yearId: 2026, month: 1 },
    orderBy: { date: "asc" },
  });

  const activeAssignments = await prisma.tutorAssignment.findMany({
    where: { endDate: null },
    include: {
      classroom: { select: { centreId: true } },
    },
  });

  return { classes, activeAssignments };
}

import prisma from '@/libs/prismadb';

export const KPI_VIEWER_ROLES = ['ADMIN', 'FACILITATOR', 'TUTOR', 'RELF_EMPLOYEE'] as const;

export async function canViewKpis(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  return user?.roleHistory.some((entry) => KPI_VIEWER_ROLES.includes(entry.role.name as (typeof KPI_VIEWER_ROLES)[number])) ?? false;
}

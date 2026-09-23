import { authOptions } from '@/libs/authOptions';
import { getServerSession } from 'next-auth';

export const KPI_VIEWER_ROLES = ['ADMIN', 'FACILITATOR', 'TUTOR', 'RELF_EMPLOYEE'] as const;

export async function canViewKpis(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const session = await getServerSession(authOptions);
  if (session?.user?.id !== userId) return false;
  return session.user.roles?.some((role) =>
    KPI_VIEWER_ROLES.includes(role as (typeof KPI_VIEWER_ROLES)[number]),
  ) ?? false;
}

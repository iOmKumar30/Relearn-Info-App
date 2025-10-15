// RBAC: ADMIN only (server-side)
import prisma from "@/libs/prismadb";
export async function isAdmin(userId?: string) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roleHistory: {
        where: { endDate: null },
        select: { role: { select: { name: true } } },
      },
    },
  });
  const names = u?.roleHistory?.map((h) => h.role.name) ?? [];
  return names.includes("ADMIN");
}

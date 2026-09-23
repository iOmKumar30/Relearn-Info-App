import prisma from "@/libs/prismadb";

export async function getSidebarProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, avatarUrl: true },
  });
}

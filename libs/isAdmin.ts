import { authOptions } from "@/libs/authOptions";
import { getServerSession } from "next-auth";

export async function isAdmin(userId?: string) {
  if (!userId) return false;

  // Role claims are signed into the JWT by NextAuth. Reading them here avoids a
  // role-history database query for every API request while retaining a
  // server-side authorization check.
  const session = await getServerSession(authOptions);
  if (session?.user?.id !== userId) return false;
  return session.user.roles?.includes("ADMIN") ?? false;
}

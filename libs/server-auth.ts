import { authOptions } from "@/libs/authOptions";
import { getServerSession } from "next-auth";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.roles?.includes("ADMIN") ?? false;
}

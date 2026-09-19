import SidebarLayout from "@/components/Sidebar";
import { authOptions } from "@/libs/authOptions";
import { getSidebarProfile } from "@/libs/sidebar-profile";
import { Role } from "@/libs/roleMenus";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/");
  }
  const roles = Array.isArray((session as any)?.user?.roles)
    ? ((session as any).user.roles as Role[])
    : [];
  const profile = await getSidebarProfile(session.user.id);
  return (
    <>
      <SidebarLayout roles={roles} profile={profile}>{children}</SidebarLayout>
    </>
  );
}

import LogoutButton from "@/components/LogoutButton";
import SidebarLayout from "@/components/Sidebar";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LogoutButton />
      <SidebarLayout role="Admin">{children}</SidebarLayout>
    </>
  );
}

"use client";

import { ClipLoader } from "react-spinners";
import { useRBAC } from "../hooks/useRBAC";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { status, hasAccess } = useRBAC(["ROLE2", "ADMIN", "SUPERADMIN"]);

  if (status === "loading" || !hasAccess) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={40} />
      </div>
    );
  }

  return <>{children}</>;
}

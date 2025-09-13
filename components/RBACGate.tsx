"use client";

import { useRBAC } from "@/app/hooks/useRBAC";
import React from "react";
import { ClipLoader } from "react-spinners";

interface GateProps {
  roles: string[];
  children: React.ReactNode;
}

export default function RBACGate({ roles, children }: GateProps) {
  const { status, hasAccess } = useRBAC(roles);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <ClipLoader size={40} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg font-semibold">Access denied</p>
      </div>
    );
  }

  return <>{children}</>;
}

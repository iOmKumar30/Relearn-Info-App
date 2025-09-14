"use client";

import LogoutButton from "@/components/LogoutButton";

export default function Dashboard() {
  return (
    <div className="text-black p-6 h-full w-full flex items-center justify-center">
      Welcome to Your Dashboard!
      <LogoutButton />
    </div>
  );
}

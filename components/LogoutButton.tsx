"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded shadow cursor-pointer hover:opacity-80 text-center" 
    >
      Logout
    </button>
  );
}

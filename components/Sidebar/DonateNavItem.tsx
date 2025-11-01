// components/Sidebar/DonateNavItem.tsx
"use client";
import { DocumentCurrencyRupeeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function DonateNavItem() {
  const [loading, setLoading] = useState(false);

  const openDonations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/donations/sso", { method: "GET" });
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Unable to open Donations");
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={openDonations}
      className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded"
      title="Donations"
      disabled={loading}
    >
      <DocumentCurrencyRupeeIcon className="h-5 w-5" />
      <span>{loading ? "Opening…" : "Donations"}</span>
    </button>
  );
}

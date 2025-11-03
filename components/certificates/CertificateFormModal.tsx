"use client";

import { Button } from "flowbite-react";
import { useState } from "react";

export default function CertificateFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim() || !year.trim()) {
      alert("Please enter name and year");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), year: year.trim(), date }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCreated();
    } catch (e: any) {
      alert(e?.message || "Failed to create certificate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-lg bg-white p-5">
        <div className="text-lg font-medium">Create Membership Certificate</div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Member full name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Year</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2025-26"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date</label>
            <input
              type="date"
              className="w-full rounded border px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button color="light" onClick={onClose}>
            Cancel
          </Button>
          <Button color="success" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

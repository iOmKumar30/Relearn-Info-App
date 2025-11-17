"use client";

import { useEffect, useState } from "react";

type Centre = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  state: string;
};

export default function CentreSelectAll({
  value, // comma-separated centre codes or empty string
  onChange, // emits comma-separated centre codes or empty string
  disabled,
  placeholder = "Select centres",
}: {
  value: string;
  onChange: (codes: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [items, setItems] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Parse current value into a set of selected codes
  const selectedCodes = new Set(
  (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);


  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      try {
        const url = new URL("/api/admin/centres", window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "1000");
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!abort) setItems(json.rows || []);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  const handleToggle = (code: string) => {
    const newSelected = new Set(selectedCodes);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    const codesStr = Array.from(newSelected).join(",");
    onChange(codesStr);
  };

  const handleClearAll = () => {
    onChange("");
  };

  const displayLabel =
    selectedCodes.size === 0
      ? placeholder
      : `${selectedCodes.size} centre${
          selectedCodes.size > 1 ? "s" : ""
        } selected`;

  return (
    <div className="relative w-full">
      {/* Dropdown trigger button */}
      <button
        className="w-full rounded border px-2 py-2 text-left bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        aria-label="Select Centres"
      >
        <span className="text-sm">{displayLabel}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded border bg-white shadow-lg">
          {/* Loading state */}
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Loading centres...</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              No centres available
            </div>
          ) : (
            <>
              {/* Checkbox list */}
              <div className="max-h-60 overflow-y-auto p-2">
                {items.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCodes.has(c.code)}
                      onChange={() => handleToggle(c.code)}
                      className="rounded"
                    />
                    <span>
                      {c.code} — {c.name}
                      {c.city ? `, ${c.city}` : ""} ({c.state})
                    </span>
                  </label>
                ))}
              </div>

              {/* Action buttons */}
              <div className="border-t p-2 flex justify-between gap-2">
                <button
                  className="flex-1 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
                <button
                  className="flex-1 text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

type Hit = { id: string; name: string | null; email: string };
export default function UserSelect({
  role = "TUTOR",
  value,
  onChange,
  placeholder = "Search tutors...",
}: {
  role?: "TUTOR" | "FACILITATOR" | "EMPLOYEE";
  value?: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const t = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (t.current) clearTimeout(t.current);
    t.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("/api/admin/users/by-role", window.location.origin);
        url.searchParams.set("role", role);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "10");
        if (term.trim()) url.searchParams.set("q", term.trim());
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setItems(
            (json.rows || []).map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
            }))
          );
        } else setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [term, open, role]);

  return (
    <div className="relative">
      <input
        value={open ? term : value?.label || ""}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setTerm("");
        }}
        placeholder={placeholder}
        className="w-full rounded border px-3 py-2"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded border bg-white shadow">
          {loading ? (
            <div className="p-2 text-sm text-gray-500">Searching…</div>
          ) : items.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">No results</div>
          ) : (
            <ul className="max-h-60 overflow-auto">
              {items.map((u) => {
                const label = `${u.name ?? "Unnamed"} — ${u.email}`;
                return (
                  <li
                    key={u.id}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100 text-sm"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ id: u.id, label });
                      setOpen(false);
                    }}
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t p-2 text-right">
            <button
              type="button"
              className="rounded bg-gray-100 px-2 py-1 text-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

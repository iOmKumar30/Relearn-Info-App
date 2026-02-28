"use client";
import { useEffect, useRef, useState } from "react";

type Hit = {
  id: string;
  code: string;
  centre?: { code: string; name: string } | null;
};
export default function ClassroomSelect({
  value,
  onChange,
  placeholder = "Search classrooms...",
  centreId, 
}: {
  value?: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
    placeholder?: string;
    centreId?: string
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
        const url = new URL("/api/admin/classrooms", window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "10");
        if (term.trim()) url.searchParams.set("q", term.trim());
        if (centreId) url.searchParams.set("centreId", centreId);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setItems(
            (json.rows || []).map((c: any) => ({
              id: c.id,
              code: c.code,
              centre: c.centre ?? null,
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
  }, [term, open, centreId]);

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
              {items.map((c) => {
                const label = `${c.code} — ${c.centre?.code ?? ""} ${
                  c.centre?.name ?? ""
                }`.trim();
                return (
                  <li
                    key={c.id}
                    className="cursor-pointer px-3 py-2 hover:bg-gray-100 text-sm"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ id: c.id, label });
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

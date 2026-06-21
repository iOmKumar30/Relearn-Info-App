// components/Selectors/StudentSelect.tsx
"use client";

import { Button, Spinner, TextInput } from "flowbite-react";
import { useEffect, useMemo, useRef, useState } from "react";

type StudentHit = {
  id: string;
  name: string;
  rollNo: string;
  schoolName?: string | null;
  city?: string | null;
  state?: string | null;
};

type Props = {
  value?: { id: string; label: string } | null;
  onChange: (val: { id: string; label: string } | null) => void;
  placeholder?: string;
};

export default function StudentSelect({
  value,
  onChange,
  placeholder = "Search students...",
}: Props) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StudentHit[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timer.current) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL(
          "/api/admin/students/search",
          window.location.origin,
        );
        if (term.trim()) url.searchParams.set("q", term.trim());
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
          setItems([]);
          return;
        }
        const json = await res.json();
        setItems(json.rows || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [term, open]);

  const displayLabel = useMemo(() => value?.label ?? "", [value]);

  return (
    <div className="relative w-full">
      <TextInput
        value={open ? term : displayLabel}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setTerm("");
        }}
        placeholder={placeholder}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
              <Spinner size="sm" />
              Searching...
            </div>
          ) : items.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            <ul className="max-h-64 overflow-auto">
              {items.map((s) => {
                const label = `${s.name} — ${s.rollNo}${s.schoolName ? ` • ${s.schoolName}` : ""}`;
                return (
                  <li
                    key={s.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ id: s.id, label });
                      setOpen(false);
                    }}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">
                      {s.rollNo}
                      {s.schoolName ? ` • ${s.schoolName}` : ""}
                      {[s.city, s.state].filter(Boolean).length
                        ? ` • ${[s.city, s.state].filter(Boolean).join(", ")}`
                        : ""}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t p-2 text-right">
            <Button
              size="xs"
              color="light"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

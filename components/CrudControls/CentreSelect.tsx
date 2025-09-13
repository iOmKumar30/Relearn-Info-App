"use client";

import { Button, Spinner, TextInput } from "flowbite-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Centre = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  state: string;
};

type Props = {
  value?: { id: string; label: string } | null;
  onChange: (val: { id: string; label: string } | null) => void;
  placeholder?: string;
};

export default function CentreSelect({
  value,
  onChange,
  placeholder = "Search centres...",
}: Props) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Centre[]>([]);
  const timer = useRef<number | null>(null);

  // Debounce q changes
  useEffect(() => {
    if (!open) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const q = term.trim();
      setLoading(true);
      try {
        // fetch small page of matching centres
        const url = new URL("/api/admin/centres", window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "10");
        if (q) url.searchParams.set("q", q);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setItems(json.rows || []);
        } else {
          setItems([]);
        }
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

  const displayLabel = useMemo(() => {
    return value?.label ?? "";
  }, [value]);

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
        <div className="absolute z-50 mt-1 w-full rounded border bg-white shadow">
          {loading ? (
            <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
              <Spinner size="sm" /> Searching...
            </div>
          ) : items.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            <ul className="max-h-60 overflow-auto">
              {items.map((c) => {
                const label = `${c.code} — ${c.name}${
                  c.city ? `, ${c.city}` : ""
                } (${c.state})`;
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

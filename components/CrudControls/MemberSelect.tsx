"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

type Hit = {
  id: string;
  name: string;
  email: string;
  memberId: string | null;
};

export default function MemberSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select member to add...",
}: {
  value?: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!term.trim()) {
      setItems([]);
      return;
    }

    searchTimeout.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("/api/admin/members", window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "10");
        url.searchParams.set("status", "ACTIVE");
        url.searchParams.set("q", term.trim());

        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setItems(
            (json.rows || []).map((m: any) => ({
              id: m.id,
              name: m.name || "Unknown",
              email: m.email,
              memberId: m.memberId,
            })),
          );
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [term, open]);

  const handleSelect = (member: Hit) => {
    const label = `${member.name} (${member.memberId || "No ID"})`;
    onChange({ id: member.id, label });
    setOpen(false);
    setTerm(""); // Clear search for next time
  };

  return (
    <div className="relative w-full min-w-[250px]" ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`w-full rounded-lg border px-3 py-2 text-left bg-white shadow-sm hover:bg-gray-50 flex justify-between items-center ${
          disabled
            ? "bg-gray-100 cursor-not-allowed text-gray-400"
            : "text-gray-900 border-gray-300"
        }`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className={`block truncate ${!value ? "text-gray-500" : ""}`}>
          {value ? value.label : placeholder}
        </span>
        <svg
          className="w-4 h-4 text-gray-500 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 rounded-lg border bg-white shadow-xl">
          {/* Search Input Area */}
          <div className="p-2 border-b">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Type name to search..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Results List */}
          <ul className="max-h-60 overflow-auto py-1">
            {loading ? (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                Searching...
              </li>
            ) : items.length === 0 && term ? (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                No members found
              </li>
            ) : items.length === 0 && !term ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">
                Type to find a member
              </li>
            ) : (
              items.map((m) => (
                <li
                  key={m.id}
                  className="cursor-pointer px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 border-gray-50"
                  onClick={() => handleSelect(m)}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {m.name}
                  </div>
                  <div className="text-xs text-gray-500">{m.email}</div>
                  {m.memberId && (
                    <div className="text-xs text-blue-600 font-mono mt-0.5">
                      {m.memberId}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>

          {/* Footer Actions */}
          <div className="p-2 border-t bg-gray-50 rounded-b-lg flex justify-end">
            <button
              className="text-xs text-gray-600 hover:text-red-600 font-medium px-2 py-1"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { PartyResult, searchParties } from "@/app/actions/member-lookup";
import { Check, ChevronsUpDown, GraduationCap, User } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export default function PartySelect({
  value,
  onChange,
  placeholder = "Search name...",
  disabled = false,
}: {
  value: string;
  onChange: (name: string, party?: PartyResult) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PartyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setActiveIndex(-1);
    if (!open || disabled || value.trim().length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchParties(value);
        if (!cancelled) setItems(results);
      } catch (err) {
        console.error(err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, value, disabled]);

  const selectParty = (party: PartyResult) => {
    onChange(party.name, party);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={container} className="relative party-select-container">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          role="combobox"
          aria-label="Party name"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, items.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(0, index - 1));
            }
            if (
              event.key === "Enter" &&
              open &&
              activeIndex >= 0 &&
              items[activeIndex]
            ) {
              event.preventDefault();
              selectParty(items[activeIndex]);
            }
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-blue-200 rounded bg-white focus:ring-2 focus:ring-blue-500 text-sm pr-8 disabled:bg-gray-100 disabled:text-gray-500"
        />
        <ChevronsUpDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 opacity-50" />
      </div>

      {open && (items.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg animate-in fade-in zoom-in-95">
          {loading ? (
            <div className="p-2 text-xs text-gray-400">Searching...</div>
          ) : (
            <ul
              id={listId}
              role="listbox"
              className="max-h-60 overflow-auto py-1"
            >
              {items.map((item, index) => (
                <li
                  key={`${item.type}-${item.id}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`cursor-pointer px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between group ${activeIndex === index ? "bg-blue-50" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectParty(item)}
                >
                  <div className="flex items-center gap-2">
                    {item.type === "MEMBER" ? (
                      <User className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <GraduationCap className="w-3.5 h-3.5 text-green-500" />
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700">
                        {item.name}
                      </span>
                      {item.code && (
                        <span className="text-[10px] text-gray-400">
                          {item.code}
                        </span>
                      )}
                    </div>
                  </div>
                  {value === item.name && (
                    <Check className="w-3 h-3 text-blue-600" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && !loading && items.length === 0 && value.length > 1 && (
        <div className="absolute z-50 mt-1 w-full rounded border bg-white shadow p-2 text-xs text-gray-500">
          No matching parties found. You can keep "{value}" as a new name.
        </div>
      )}
    </div>
  );
}

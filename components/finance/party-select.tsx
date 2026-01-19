"use client";

import { PartyResult, searchParties } from "@/app/actions/member-lookup";
import { Check, ChevronsUpDown, GraduationCap, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function PartySelect({
  value,
  onChange,
  placeholder = "Search name...",
}: {
  value: string; 
  onChange: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PartyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const t = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setOpen(true); 

    // Debounce search
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchParties(val);
        setItems(results);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".party-select-container")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative party-select-container">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
            if (value) handleInputChange({ target: { value } } as any);
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-blue-200 rounded bg-white focus:ring-2 focus:ring-blue-500 text-sm pr-8"
        />
        <ChevronsUpDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 opacity-50" />
      </div>

      {open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg animate-in fade-in zoom-in-95">
          {loading ? (
            <div className="p-2 text-xs text-gray-400">Searching...</div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="cursor-pointer px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between group"
                  onClick={() => {
                    onChange(item.name); // Set the name
                    setOpen(false);
                  }}
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
          No matching members found. You can keep "{value}" as a new name.
        </div>
      )}
    </div>
  );
}

"use client";

import { FilterOption } from "@/types/filterOptions";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

interface FilterDropdownProps {
  filters: FilterOption[];
  onFilterChange: (selected: Record<string, string>) => void;
}

export default function FilterDropdown({
  filters,
  onFilterChange,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});

  function handleChange(key: string, value: string): void {
    const updated: Record<string, string> = { ...selected, [key]: value };
    setSelected(updated);
    onFilterChange(updated);
  }

  const wrapperRef = useRef<HTMLDivElement>(null);

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block text-left w-full sm:w-auto"
    >
      <style>{`
        @media (min-width: 640px) {
          .custom-filter-width { width: 300px !important; }
        }
      `}</style>

      <button
        className="inline-flex w-full items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm font-medium shadow group sm:w-auto"
        onClick={() => setOpen(!open)}
      >
        <FunnelIcon className="mr-2 h-4 w-4 shrink-0" />
        Filter options
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-full custom-filter-width origin-top-right max-h-[70vh] overflow-y-auto rounded-lg border bg-white p-4 shadow-lg">
          <div className="mb-2 font-semibold text-gray-700">Filters</div>
          {filters.map((f) => (
            <div key={f.key} className="mb-3">
              <label
                htmlFor={`filter-select-${f.key}`}
                className="text-xs font-medium mb-1 block"
              >
                {f.label}
              </label>

              {/* Use customRenderer if provided */}
              {f.customRenderer ? (
                f.customRenderer({
                  value: selected[f.key] || "",
                  onChange: (v) => handleChange(f.key, v),
                })
              ) : f.type === "select" ? (
                <select
                  id={`filter-select-${f.key}`}
                  className="w-full border rounded p-1 text-sm"
                  value={selected[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  aria-label={f.label}
                >
                  <option value="">Any</option>
                  {f.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                (f.type === "number" || f.type === "text") && (
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    type={f.type}
                    value={selected[f.key] || ""}
                    placeholder={f.label}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                  />
                )
              )}
            </div>
          ))}

          <button
            className="mt-2 text-blue-600 hover:underline text-xs font-medium"
            onClick={() => {
              setSelected({});
              onFilterChange({});
            }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

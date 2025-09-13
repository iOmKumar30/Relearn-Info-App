"use client";
import { useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { FilterOption } from '@/types/filterOptions';

interface FilterDropdownProps {
  filters: FilterOption[];
  onFilterChange: (selected: Record<string, string>) => void;
}

export default function FilterDropdown({ filters, onFilterChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});

interface HandleChangeParams {
    key: string;
    value: string;
}

function handleChange(key: HandleChangeParams['key'], value: HandleChangeParams['value']): void {
    const updated: Record<string, string> = { ...selected, [key]: value };
    setSelected(updated);
    onFilterChange(updated);
}

  return (
    <div className="relative ml-2">
      <button
        className="inline-flex items-center px-3 py-2 rounded-lg border bg-white text-sm font-medium shadow group"
        onClick={() => setOpen(!open)}
      >
        <FunnelIcon className="w-4 h-4 mr-2" />
        Filter options
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-white shadow-lg p-4">
          <div className="mb-2 font-semibold text-gray-700">Filters</div>
          {filters.map(f => (
            <div key={f.key} className="mb-3">
              <label htmlFor={`filter-select-${f.key}`} className="text-xs font-medium mb-1 block">{f.label}</label>
              {f.type === "select" && (
                <select
                  id={`filter-select-${f.key}`}
                  className="w-full border rounded p-1"
                  value={selected[f.key] || ""}
                  onChange={e => handleChange(f.key, e.target.value)}
                  aria-label={f.label}
                >
                  <option value="">Any</option>
                  {f.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {(f.type === "number" || f.type === "text") && (
                <input
                  className="w-full border rounded px-2 py-1"
                  type={f.type}
                  value={selected[f.key] || ""}
                  placeholder={f.label}
                  onChange={e => handleChange(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <button className="mt-2 text-blue-600 hover:underline text-xs font-medium" onClick={() => {setSelected({}); onFilterChange({});}}>Clear all</button>
        </div>
      )}
    </div>
  );
}

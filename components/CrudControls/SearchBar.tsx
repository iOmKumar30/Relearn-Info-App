"use client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        className="w-full rounded-lg border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-200"
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
    </div>
  );
}

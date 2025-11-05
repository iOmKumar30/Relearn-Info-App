"use client";
import { ALL_STATE_OPTIONS } from "@/libs/geo/stateCodes";

type StateOption = {
  code: string;
  name: string;
  label: string;
};

export default function StateSelect({
  value, // full state name string or null
  onChange, // returns full state name string or null
  disabled,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  // Derive the selected code from the provided full name
  const selectedCode =
    ALL_STATE_OPTIONS.find((o: StateOption) => o.name === value)?.code || "";

  return (
    <select
      className="w-full rounded border px-2 py-2"
      value={selectedCode}
      onChange={(e) => {
        const code = e.target.value;
        const item =
          ALL_STATE_OPTIONS.find((o: StateOption) => o.code === code) || null;
        onChange(item ? item.name : null); // emit full state name
      }}
      disabled={disabled}
      aria-label="Select State"
    >
      <option value="">Select state</option>
      {ALL_STATE_OPTIONS.map((opt: StateOption) => (
        <option key={opt.code} value={opt.code}>
          {opt.name} ({opt.code})
        </option>
      ))}
    </select>
  );
}

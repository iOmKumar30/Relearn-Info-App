"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
}: ToggleSwitchProps) {
  return (
    <label className="inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        className="sr-only" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`
          relative w-11 h-6 rounded-full 
          transition-colors duration-300
          ${checked ? "bg-blue-600" : "bg-gray-300"}
        `}
      >
        <div
          className={`
            absolute top-0.5 left-0.5
            w-5 h-5 bg-white rounded-full shadow-md
            transform transition-transform duration-300 ease-in-out
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </div>

      {label && (
        <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>
      )}
    </label>
  );
}

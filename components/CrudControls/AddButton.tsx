"use client";
import { PlusIcon } from "@heroicons/react/24/solid";

type AddButtonProps = {
  label: string;
  onClick: () => void;
};

export default function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button
      className="ml-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
      onClick={onClick}
    >
      <PlusIcon className="w-5 h-5 mr-2" />
      {label}
    </button>
  );
}

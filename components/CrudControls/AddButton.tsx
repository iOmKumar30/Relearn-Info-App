"use client";
import { PlusIcon } from "@heroicons/react/24/solid";

type AddButtonProps = {
  label: string;
  onClick: () => void;
};

export default function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button
      className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700 sm:w-auto"
      onClick={onClick}
    >
      <PlusIcon className="mr-2 h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

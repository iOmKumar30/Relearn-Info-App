"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { deleteTrainingClass } from "../../actions";

export default function DeleteClassButton({
  year,
  month,
  classId,
}: {
  year: number;
  month: number;
  classId: string;
}) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    const ok = window.confirm(
      "Delete this class? This will also delete all attendance entries for this class.",
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteTrainingClass(classId, year, month);
      if (res.success) toast.success("Class deleted");
      else toast.error(res.error || "Failed to delete class");
    });
  };

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
      title="Delete class"
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  );
}

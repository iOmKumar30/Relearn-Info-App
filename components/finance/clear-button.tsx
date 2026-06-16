"use client";

import { clearMonthlyData } from "@/app/actions/finance";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export function ClearDataButton({
  monthId,
  hasData,
}: {
  monthId: string;
  hasData: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (
      !confirm(
        "Are you sure? This will DELETE ALL transactions for this month. This cannot be undone."
      )
    )
      return;

    setLoading(true);
    const toastId = toast.loading("Clearing data...");

    const res = await clearMonthlyData(monthId);
    setLoading(false);

    if (res.success) {
      toast.success(res.message, { id: toastId });
    } else {
      toast.error(res.error, { id: toastId });
    }
  };

  if (!hasData) return null; 

  return (
    <button
      onClick={handleClear}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 sm:w-auto"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      Clear All
    </button>
  );
}

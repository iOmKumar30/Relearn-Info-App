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
      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
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

"use client";

import { updateMonthlyBalances } from "@/app/actions/finance";
import {
  Check,
  Edit2,
  Loader2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface EditableBalanceProps {
  statementId: string;
  initialStartBalance: number;
  initialEndBalance: number;
}

export function EditableBalances({
  statementId,
  initialStartBalance,
  initialEndBalance,
}: EditableBalanceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [balances, setBalances] = useState({
    start: initialStartBalance,
    end: initialEndBalance,
  });
  useEffect(() => {
    setBalances({
      start: initialStartBalance,
      end: initialEndBalance,
    });
  }, [initialStartBalance, initialEndBalance]);
  const handleSave = async () => {
    setLoading(true);
    const toastId = toast.loading("Updating balances...");

    const res = await updateMonthlyBalances(
      statementId,
      Number(balances.start),
      Number(balances.end)
    );

    setLoading(false);

    if (res.success) {
      toast.success("Balances updated", { id: toastId });
      setIsEditing(false);
    } else {
      toast.error(res.error || "Failed to update", { id: toastId });
    }
  };

  const handleCancel = () => {
    setBalances({ start: initialStartBalance, end: initialEndBalance });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="col-span-1 md:col-span-2 bg-blue-50/50 p-5 rounded-xl border border-blue-200 shadow-sm flex flex-col md:flex-row gap-6 items-end md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Opening Balance
            </label>
            <input
              type="number"
              value={balances.start}
              onChange={(e) =>
                setBalances((prev) => ({
                  ...prev,
                  start: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full text-xl font-mono font-bold text-gray-800 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Closing Balance
            </label>
            <input
              type="number"
              value={balances.end}
              onChange={(e) =>
                setBalances((prev) => ({
                  ...prev,
                  end: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full text-xl font-mono font-bold text-gray-800 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            title="Save"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="bg-white text-gray-500 border border-gray-300 p-2 rounded-lg hover:bg-gray-50"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group relative bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-colors">
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 font-semibold uppercase flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" /> Opening Balance
        </p>
        <p className="text-2xl font-mono font-bold text-gray-800 mt-1">
          {Number(balances.start).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          })}
        </p>
      </div>

      <div className="group relative bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-colors">
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 font-semibold uppercase flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" /> Closing Balance
        </p>
        <p className="text-2xl font-mono font-bold text-blue-600 mt-1">
          {Number(balances.end).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          })}
        </p>
      </div>
    </>
  );
}

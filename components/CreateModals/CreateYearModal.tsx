"use client";

import { createFinancialYear } from "@/app/actions/finance";
import { useState } from "react";
import toast from "react-hot-toast";
export function CreateYearModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear()); 
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const toastId = toast.loading("Creating Financial Year...");

    const res = await createFinancialYear(year);
    setLoading(false);

    if (res.success) {
      toast.success("Financial Year created successfully", { id: toastId });
      setIsOpen(false);
    } else {
      toast.error(res.error || "Failed to create", { id: toastId });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <span>+ New Financial Year</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
        <h2 className="text-xl font-bold mb-4">Create Financial Year</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Start Year
            </label>
            <input
              type="number"
              min="2020"
              max="2030"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              This will create{" "}
              <strong>
                FY {year}-{String(year + 1).slice(-2)}
              </strong>
              <br />
              (April 1, {year} to March 31, {year + 1})
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Year"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

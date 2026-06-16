"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { updatePayoutRates } from "./actions";

interface Props {
  currentRates: {
    absentAmount: number;
    presentAmount: number;
    presentResponded: number;
  };
}

export default function PayoutRateModal({ currentRates }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [rates, setRates] = useState(currentRates);
  const [mounted, setMounted] = useState(false);
  // Ensure portal only renders on the client side to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    const result = await updatePayoutRates(rates);
    if (result.success) {
      toast.success("Payout rates updated successfully!");
      setIsOpen(false);
    } else {
      toast.error("Failed to update rates.");
    }

    setIsPending(false);
  };

  const modalContent = (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6"
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Configure Payout Rates
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Changing these rates will only affect future attendance records. Past
          records will remain at their original payout amount.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Absent (A) Amount
            </label>
            <input
              type="number"
              value={rates.absentAmount}
              onChange={(e) =>
                setRates({ ...rates, absentAmount: Number(e.target.value) })
              }
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Present (P) Amount
            </label>
            <input
              type="number"
              value={rates.presentAmount}
              onChange={(e) =>
                setRates({
                  ...rates,
                  presentAmount: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Present & Responded (P&R) Amount
            </label>
            <input
              type="number"
              value={rates.presentResponded}
              onChange={(e) =>
                setRates({
                  ...rates,
                  presentResponded: Number(e.target.value),
                })
              }
              className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving..." : "Save Rates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:w-auto"
      >
        Set Payout Rates
      </button>

      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}

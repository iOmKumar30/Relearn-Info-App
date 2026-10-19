"use client";

import {
  addTransactionToMemberDonation,
  getMemberDonationYears,
} from "@/app/actions/finance";
import { formatFinanceAmount } from "@/libs/finance-transactions";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { HeartHandshake, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import toast from "react-hot-toast";

export type MemberDonationSource = {
  transactionId: string;
  splitId?: string;
  partyName: string;
  memberCode: string;
  amount: string | number;
  txnDate: string;
  expectedUpdatedAt: string;
};

export function MemberDonationDialog({
  source,
  onClose,
  onCredited,
}: {
  source: MemberDonationSource;
  onClose: () => void;
  onCredited: (fiscalLabel: string) => void;
}) {
  const labelId = useId();
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getMemberDonationYears()
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setError(result.error ?? "Could not load financial years.");
          return;
        }
        setYears(result.years);
        const date = new Date(source.txnDate);
        const start =
          date.getUTCMonth() < 3
            ? date.getUTCFullYear() - 1
            : date.getUTCFullYear();
        const label = `${start}-${start + 1}`;
        setYear(result.years.includes(label) ? label : (result.years[0] ?? ""));
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not load financial years. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source.txnDate, retry]);

  const submit = async () => {
    if (submitting.current || !year || !confirmed) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await addTransactionToMemberDonation({
        transactionId: source.transactionId,
        splitId: source.splitId,
        fiscalLabel: year,
        expectedUpdatedAt: source.expectedUpdatedAt,
        confirmed,
      });
      if (!result.success) {
        setError(result.error ?? "Could not add donation.");
        return;
      }
      toast.success(
        result.alreadyCredited
          ? `Already credited to ${result.fiscalLabel}. No amount added again.`
          : `Donation added to ${result.fiscalLabel}.`,
      );
      onCredited(result.fiscalLabel!);
    } catch {
      setError(
        "Could not confirm the result. Refresh the page to check the donation status; retrying the same source cannot add it twice.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onClose={() => {
        if (!saving) onClose();
      }}
      size="md"
      position="center"
      dismissible={!saving}
    >
      <ModalHeader>Add member donation</ModalHeader>
      <ModalBody className="max-h-[80dvh] space-y-5 overflow-y-auto p-4 sm:p-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="break-words text-sm font-semibold text-gray-900">
            {source.partyName}
          </p>
          <p className="mt-1 text-xs text-blue-700">{source.memberCode}</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-blue-700">
            {formatFinanceAmount(source.amount)}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-gray-600">
          This amount will be added to the member’s existing yearly total. It
          records the allocation of an existing bank credit and does not create
          another bank transaction or a donation receipt.
        </p>
        <div>
          <label
            htmlFor={labelId}
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Financial year
          </label>
          <select
            id={labelId}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            disabled={loading || saving || !years.length}
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50"
          >
            {loading ? (
              <option>Loading financial years…</option>
            ) : (
              years.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))
            )}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={saving}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
          />
          <span>
            I have checked the member’s existing yearly total and confirm this
            amount is not already included. This transaction/sub-transaction can
            be credited only once.
          </span>
        </label>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
            {!years.length && !loading && (
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-11 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || saving || !year || !confirmed}
            onClick={submit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HeartHandshake className="h-4 w-4" />
            )}
            {saving ? "Adding…" : "Add donation"}
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
}

'use client';

import { useRef, useState } from 'react';
import { Modal, ModalBody, ModalHeader } from 'flowbite-react';
import { undoTransactionMemberDonation } from '@/app/actions/finance';
import {
  FinanceDonationStatus,
  formatFinanceAmount,
} from '@/libs/finance-transactions';
import toast from 'react-hot-toast';

export type DonationUndoSource = FinanceDonationStatus['credits'][number] & {
  transactionId: string;
};

export function UndoMemberDonationDialog({
  source,
  onClose,
  onUndone,
}: {
  source: DonationUndoSource;
  onClose: () => void;
  onUndone: (status: FinanceDonationStatus) => void;
}) {
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await undoTransactionMemberDonation({
        transactionId: source.transactionId,
        creditId: source.id,
        confirmed: true,
      });
      if (result.success === false) {
        setError(result.error ?? 'Could not undo this donation.');
        return;
      }
      toast.success(
        result.alreadyUndone
          ? 'This donation was already undone. No further amount subtracted.'
          : 'Donation undone.',
      );
      onUndone(result.status!);
    } catch {
      setError(
        'Could not confirm the result. Refresh to check the donation status. Retrying this undo cannot subtract the amount twice.',
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <Modal
      show
      size="md"
      dismissible={!saving}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <ModalHeader>Undo member donation</ModalHeader>
      <ModalBody className="max-h-[80dvh] space-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="break-words font-semibold">{source.partyName}</p>
          <p className="mt-1 text-sm">Financial year: {source.fiscalLabel}</p>
          <p className="mt-3 text-2xl font-bold">
            {formatFinanceAmount(source.amount)}
          </p>
        </div>
        <p className="text-sm text-gray-200">
          This amount will be subtracted from this member’s total for the
          financial year shown above. The paid-on date will stay unchanged. You
          can then correct the party or financial year and add the donation
          again.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-11 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="min-h-11 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Undoing…' : 'Confirm undo'}
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
}

"use client";

import { Button, Label, Modal, ModalBody, ModalHeader, TextInput } from "flowbite-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  fiscalLabel: string | null;
  currentAmount: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
};

export default function AddMemberFeeAmountModal({
  open,
  fiscalLabel,
  currentAmount,
  onClose,
  onConfirm,
}: Props) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount("");
      setError(null);
    }
  }, [open, fiscalLabel]);

  const handleConfirm = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }

    onConfirm(value);
    onClose();
  };

  return (
    <Modal show={open} onClose={onClose} size="md">
      <ModalHeader>Add Membership Fee Payment</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{fiscalLabel}</span>
            {" · Current total: "}₹{currentAmount}
          </p>
          <div>
            <Label htmlFor="additional-member-fee-amount">
              Amount to add
            </Label>
            <TextInput
              id="additional-member-fee-amount"
              autoFocus
              min="0.01"
              step="0.01"
              type="number"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="Enter amount"
              aria-describedby={error ? "additional-member-fee-error" : undefined}
            />
            {error && (
              <p id="additional-member-fee-error" className="mt-1 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            The amount will be added to the existing total when the member form is saved.
          </p>
          <div className="flex justify-end gap-2">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button color="blue" onClick={handleConfirm}>
              Add Amount
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}

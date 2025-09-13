"use client";

import { Button, Modal, ModalBody, ModalHeader } from "flowbite-react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  processing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  open,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item?",
  confirmLabel = "Delete",
  processing = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal show={open} size="md" onClose={onCancel} popup>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{message}</p>
          <div className="flex justify-end gap-2">
            <Button color="light" onClick={onCancel} disabled={processing}>
              Cancel
            </Button>
            <Button color="failure" onClick={onConfirm} disabled={processing}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}

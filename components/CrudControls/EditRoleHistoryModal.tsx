"use client";

import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";

type Props = {
  open: boolean;
  roleHistory: any;
  onClose: () => void;
  onSave: (startDate: Date | null, endDate: Date | null) => Promise<void>;
};

function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EditRoleHistoryModal({
  open,
  roleHistory,
  onClose,
  onSave,
}: Props) {
  const rawData = roleHistory?.__raw || roleHistory;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get("startDate") || "");
    const endDate = String(formData.get("endDate") || "");

    onSave(startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);
  }

  return (
    <Modal show={open} onClose={onClose} size="md">
      <ModalHeader>Edit Role History</ModalHeader>
      <ModalBody className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        {roleHistory && (
          <form key={roleHistory.id} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-2 block">Role</Label>
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {rawData?.role?.name ?? roleHistory.role ?? "—"}
              </div>
            </div>
            <div>
              <Label htmlFor="role-history-start" className="mb-2 block">
                Start Date
              </Label>
              <TextInput
                id="role-history-start"
                name="startDate"
                type="date"
                required
                defaultValue={toInputDate(rawData?.startDate)}
              />
            </div>
            <div>
              <Label htmlFor="role-history-end" className="mb-2 block">
                End Date
              </Label>
              <TextInput
                id="role-history-end"
                name="endDate"
                type="date"
                defaultValue={toInputDate(rawData?.endDate)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to keep this role active.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
              <Button color="gray" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" color="blue">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </ModalBody>
    </Modal>
  );
}

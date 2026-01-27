"use client";

import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import React from "react";

const toInputDate = (isoString?: string) => {
  if (!isoString) return "";
  return new Date(isoString).toISOString().split("T")[0];
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialData: {
    id: string;
    startDate?: string;
    endDate?: string;
  } | null;
  onSave: (id: string, startDate: string, endDate: string | null) => void;
}

export default function EditFacilitatorModal({
  open,
  onClose,
  initialData,
  onSave,
}: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const startDate = formData.get("startDate") as string;
    const endDateRaw = formData.get("endDate") as string;

    // Convert empty string to null for the API
    const endDate = endDateRaw ? endDateRaw : null;

    onSave(initialData.id, startDate, endDate);
  };

  return (
    <Modal show={open} onClose={onClose} size="md">
      <ModalHeader>Edit Assignment Dates</ModalHeader>
      <ModalBody>
        {initialData && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Start Date</Label>
              <TextInput
                id="fac-start"
                name="startDate"
                type="date"
                required
                defaultValue={toInputDate(initialData.startDate)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <TextInput
                id="fac-end"
                name="endDate"
                type="date"
                defaultValue={toInputDate(initialData.endDate)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave End Date empty to make this assignment active.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button color="gray" onClick={onClose}>
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

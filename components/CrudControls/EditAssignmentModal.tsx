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
  assignment: any;
  onClose: () => void;
  onSave: (startDate: Date | null, endDate: Date | null) => Promise<void>;
};

// Your CORRECT local time helper
const toInputDate = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function EditAssignmentModal({
  open,
  assignment,
  onClose,
  onSave,
}: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startStr = formData.get("startDate") as string;
    const endStr = formData.get("endDate") as string;

    const newStart = startStr ? new Date(startStr) : null;
    const newEnd = endStr ? new Date(endStr) : null;

    onSave(newStart, newEnd);
  };

  const rawData = assignment?.__raw || assignment;

  return (
    <Modal show={open} onClose={onClose} size="md">
      <ModalHeader>Edit Assignment Dates</ModalHeader>

      <ModalBody>
        {assignment && (
          <form
            key={assignment.id || "edit-form"}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="fac-start" className="mb-2 block">
                Start Date
              </Label>
              <TextInput
                id="fac-start"
                name="startDate"
                type="date"
                required
                defaultValue={toInputDate(rawData?.startDate)}
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="fac-end" className="mb-2 block">
                End Date
              </Label>
              <TextInput
                id="fac-end"
                name="endDate"
                type="date"
                defaultValue={toInputDate(rawData?.endDate)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep assignment active
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
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

"use client";

import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  TextInput,
} from "flowbite-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  assignment: any; // The raw assignment object
  onClose: () => void;
  onSave: (
    startDate: string,
    endDate: string | null,
    isSubstitute: boolean,
  ) => Promise<void>;
};

const toInputDate = (d: any) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function EditAssignmentModal({
  open,
  assignment,
  onClose,
  onSave,
}: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState("PRIMARY"); // "PRIMARY" | "SUBSTITUTE"

  useEffect(() => {
    if (open && assignment) {
      setStart(
        toInputDate(assignment.__raw?.startDate || assignment.startDate),
      );
      setEnd(toInputDate(assignment.__raw?.endDate || assignment.endDate));
      // Map boolean isSubstitute to string for Select
      const isSub = assignment.__raw?.isSubstitute ?? assignment.isSubstitute;
      setType(isSub ? "SUBSTITUTE" : "PRIMARY");
    }
  }, [open, assignment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass raw strings to parent; let parent/API handle date parsing if needed,
    // or parse here. We'll pass strings for consistency with the new input values.
    // 'end' can be empty string -> convert to null
    onSave(start, end || null, type === "SUBSTITUTE");
  };

  return (
    <Modal show={open} onClose={onClose} size="md">
      <ModalHeader>Edit Assignment</ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Assignment Type */}
          <div>
            <div className="mb-2 block">
              <Label>Assignment Type</Label>
            </div>
            <Select
              id="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="PRIMARY">Assigned (Primary)</option>
              <option value="SUBSTITUTE">Replacement (Substitute)</option>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <div className="mb-2 block">
              <Label>Start Date</Label>
            </div>
            <TextInput
              id="startDate"
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <div className="mb-2 block">
              <Label>End Date</Label>
            </div>
            <TextInput
              id="endDate"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="blue">
              Save
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

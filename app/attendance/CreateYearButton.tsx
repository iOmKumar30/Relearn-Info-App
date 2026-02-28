"use client";

import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiPlus } from "react-icons/hi";
import { createYear } from "./actions";

export default function CreateYearButton({
  existingYears,
}: {
  existingYears: number[];
}) {
  const router = useRouter();
  const [isModalOpen, setModalOpen] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const yearNum = parseInt(newYear);

    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      setError("Please enter a valid year between 2020 and 2100");
      return;
    }

    if (existingYears.includes(yearNum)) {
      setError("This year already exists in the system");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createYear(yearNum);
      if (result.success) {
        setModalOpen(false);
        setNewYear("");
        router.refresh(); 
        router.push(`/attendance/${yearNum}`); 
      } else {
        setError(result.error || "Failed to create year");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        color="blue"
        onClick={() => setModalOpen(true)}
        className="shadow-md hover:shadow-lg transition-all px-2"
      >
        <HiPlus className="mr-2 h-5 w-5" />
        Create New Year
      </Button>

      <Modal
        show={isModalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
          setNewYear("");
        }}
        size="md"
      >
        <ModalHeader>Add Academic Year</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <div className="mb-2 block">
                <Label htmlFor="year">Enter Academic Year (e.g., 2026)</Label>
              </div>
              <TextInput
                id="year"
                type="number"
                placeholder="2026"
                value={newYear}
                onChange={(e) => {
                  setNewYear(e.target.value);
                  setError("");
                }}
                color={error ? "failure" : undefined}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex justify-end gap-2">
          <Button
            color="gray"
            onClick={() => setModalOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleCreate}
            disabled={isSubmitting || !newYear}
          >
            {isSubmitting ? "Creating..." : "Create Year"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

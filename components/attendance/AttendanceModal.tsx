"use client";

import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useEffect, useState } from "react";

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialData?: any;
  centreId?: string;
  onSubmit: (data: any) => void;
}

export default function AttendanceModal({
  isOpen,
  onClose,
  mode,
  initialData,
  onSubmit,
}: AttendanceModalProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (isOpen && initialData) {
      if (mode === "edit") {
        setFormData({
          ...initialData,
          totalStudentsEnrolled: initialData.totalStudentsEnrolled || "",
          openDays: initialData.openDays || "",
          totalPresent: initialData.totalPresent || "",
          remarks: initialData.remarks || "",
          registerPhotoUrl: initialData.registerPhotoUrl || "",
        });
      } else {
        // Create mode (but specific to the selected row/classroom)
        setFormData({
          classroomId: initialData.classroomId, // We already have the ID from the row!
          code: initialData.code,
          tutorName: initialData.tutorName,
          totalStudentsEnrolled: "",
          openDays: "",
          totalPresent: "",
          remarks: "",
          registerPhotoUrl: "",
        });
      }
    }
  }, [isOpen, mode, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, mode });
    onClose();
  };

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      size="md"
      theme={{
        content: {
          inner:
            "relative rounded-lg bg-white shadow flex flex-col max-h-[90vh] dark:bg-gray-800",
        },
      }}
    >
      <ModalHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col">
          <span className="text-gray-900 dark:text-white font-bold text-lg">
            {mode === "create" ? "Submit Attendance" : "Edit Attendance"}
          </span>
          <span className="text-sm font-normal text-blue-600 mt-1">
            {formData.tutorName} ({formData.code})
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* We no longer need the ClassroomSelect component here! */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="totalStudents"
                className="text-gray-900 dark:text-gray-200"
              >
                Total Students Enrolled
              </Label>
              <TextInput
                id="totalStudents"
                type="number"
                placeholder="30"
                required
                value={formData.totalStudentsEnrolled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    totalStudentsEnrolled: Number(e.target.value),
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label
                htmlFor="openDays"
                className="text-gray-900 dark:text-gray-200"
              >
                Open Days
              </Label>
              <TextInput
                id="openDays"
                type="number"
                placeholder="20"
                required
                value={formData.openDays}
                onChange={(e) =>
                  setFormData({ ...formData, openDays: Number(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="totalPresent"
              className="text-gray-900 dark:text-gray-200"
            >
              Total Present (Sum)
            </Label>
            <TextInput
              id="totalPresent"
              type="number"
              placeholder="500"
              required
              value={formData.totalPresent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalPresent: Number(e.target.value),
                })
              }
              className="mt-1"
            />
            {formData.totalPresent > 0 &&
              formData.totalStudentsEnrolled > 0 &&
              formData.openDays > 0 && (
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2">
                  Calculated Percentage:{" "}
                  {(
                    (formData.totalPresent /
                      (formData.totalStudentsEnrolled * formData.openDays)) *
                    100
                  ).toFixed(2)}
                  %
                </p>
              )}
          </div>

          <div>
            <Label
              htmlFor="photoUrl"
              className="text-gray-900 dark:text-gray-200"
            >
              Register Photo URL
            </Label>
            <TextInput
              id="photoUrl"
              type="url"
              placeholder="https://..."
              value={formData.registerPhotoUrl || ""}
              onChange={(e) =>
                setFormData({ ...formData, registerPhotoUrl: e.target.value })
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label
              htmlFor="remarks"
              className="text-gray-900 dark:text-gray-200"
            >
              Remarks
            </Label>
            <Textarea
              id="remarks"
              rows={3}
              placeholder="Any issues or notes..."
              value={formData.remarks || ""}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              className="mt-1 resize-none"
            />
          </div>
        </form>
      </ModalBody>

      <ModalFooter className="border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <Button
          color="gray"
          onClick={onClose}
          className="border-gray-300 dark:border-gray-600"
        >
          Cancel
        </Button>
        <Button color="blue" onClick={handleSubmit}>
          {mode === "create" ? "Submit Record" : "Save Changes"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

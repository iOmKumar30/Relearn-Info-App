"use client";

import StudentSelect from "@/components/CrudControls/StudentSelect";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { useEffect, useMemo, useState } from "react";

type StudentValue = { id: string; label: string } | null;

type FormState = {
  id?: string;
  student: StudentValue;
  totalMarks: string;
  marksObtained: string;
  grade: string;
};

const EMPTY_FORM: FormState = {
  student: null,
  totalMarks: "",
  marksObtained: "",
  grade: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  fixedYear: number;
  initialValues?: FormState;
  onCreate?: (payload: {
    studentId: string;
    totalMarks: number;
    marksObtained: number;
    grade: string;
  }) => void;
  onUpdate?: (
    id: string,
    payload: {
      studentId: string;
      totalMarks: number;
      marksObtained: number;
      grade: string;
    },
  ) => void;
};

export default function BoardExamResultModal({
  open,
  onClose,
  mode = "create",
  fixedYear,
  initialValues,
  onCreate,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(initialValues || EMPTY_FORM);
  }, [open, initialValues]);

  const percentage = useMemo(() => {
    const total = Number(form.totalMarks);
    const obtained = Number(form.marksObtained);
    if (!Number.isFinite(total) || total <= 0) return "0.00";
    if (!Number.isFinite(obtained) || obtained < 0) return "0.00";
    return ((obtained / total) * 100).toFixed(2);
  }, [form.totalMarks, form.marksObtained]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.student?.id) return;
    const payload = {
      studentId: form.student.id,
      totalMarks: Number(form.totalMarks),
      marksObtained: Number(form.marksObtained),
      grade: form.grade.trim(),
    };

    if (mode === "edit" && form.id && onUpdate) {
      onUpdate(form.id, payload);
    } else if (mode === "create" && onCreate) {
      onCreate(payload);
    }

    onClose();
  };

  const isEdit = mode === "edit";

  return (
    <Modal show={open} onClose={onClose} size="3xl" dismissible>
      <ModalHeader>{isEdit ? "Edit Result" : "Create Result"}</ModalHeader>
      <ModalBody className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-2 block">Passing Year</Label>
            <TextInput value={String(fixedYear)} readOnly />
          </div>

          <div>
            <Label className="mb-2 block">Student</Label>
            <StudentSelect
              value={form.student}
              onChange={(student) => setForm((p) => ({ ...p, student }))}
              placeholder="Search student by name or roll no..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Total Marks</Label>
              <TextInput
                type="number"
                min={1}
                step="0.01"
                required
                value={form.totalMarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, totalMarks: e.target.value }))
                }
              />
            </div>

            <div>
              <Label className="mb-2 block">Marks Obtained</Label>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                required
                value={form.marksObtained}
                onChange={(e) =>
                  setForm((p) => ({ ...p, marksObtained: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Percentage</Label>
              <TextInput value={`${percentage}%`} readOnly />
            </div>

            <div>
              <Label className="mb-2 block">Grade</Label>
              <TextInput
                required
                value={form.grade}
                onChange={(e) =>
                  setForm((p) => ({ ...p, grade: e.target.value }))
                }
                placeholder="e.g. A1 / Distinction / Pass"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="blue"
              type="submit"
              disabled={
                !form.student ||
                !form.totalMarks ||
                !form.marksObtained ||
                !form.grade ||
                Number(form.totalMarks) <= 0 ||
                Number(form.marksObtained) < 0 ||
                Number(form.marksObtained) > Number(form.totalMarks)
              }
            >
              {isEdit ? "Save Changes" : "Create Result"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

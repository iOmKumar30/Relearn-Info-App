'use client';

import type { LegacyBoardResultInput } from '@/libs/legacy-board-results';
import { Button, Label, Modal, ModalBody, ModalHeader, TextInput } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';

type FormState = {
  passingYear: string;
  studentName: string;
  schoolName: string;
  board: string;
  totalMarks: string;
  marksObtained: string;
  grade: string;
  reportCardUrl: string;
  studentPhotoUrl: string;
  parentContactNumber: string;
  classroomTutor: string;
};

export type LegacyBoardResultRecord = LegacyBoardResultInput & { id: string };

const EMPTY_FORM: FormState = {
  passingYear: '',
  studentName: '',
  schoolName: '',
  board: '',
  totalMarks: '',
  marksObtained: '',
  grade: '',
  reportCardUrl: '',
  studentPhotoUrl: '',
  parentContactNumber: '',
  classroomTutor: '',
};

function toFormState(value?: LegacyBoardResultInput): FormState {
  if (!value) return EMPTY_FORM;
  return {
    passingYear: String(value.passingYear ?? ''),
    studentName: value.studentName ?? '',
    schoolName: value.schoolName ?? '',
    board: value.board ?? '',
    totalMarks: value.totalMarks === null || value.totalMarks === undefined ? '' : String(value.totalMarks),
    marksObtained: value.marksObtained === null || value.marksObtained === undefined ? '' : String(value.marksObtained),
    grade: value.grade ?? '',
    reportCardUrl: value.reportCardUrl ?? '',
    studentPhotoUrl: value.studentPhotoUrl ?? '',
    parentContactNumber: value.parentContactNumber ?? '',
    classroomTutor: value.classroomTutor ?? '',
  };
}

export default function LegacyBoardResultModal({
  open,
  mode = 'create',
  initialValues,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode?: 'create' | 'edit';
  initialValues?: LegacyBoardResultInput;
  onClose: () => void;
  onSubmit: (value: LegacyBoardResultInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(toFormState(initialValues));
  }, [open, initialValues]);

  const percentage = useMemo(() => {
    const total = Number(form.totalMarks);
    const obtained = Number(form.marksObtained);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(obtained)) return null;
    return ((obtained / total) * 100).toFixed(2);
  }, [form.marksObtained, form.totalMarks]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        passingYear: Number(form.passingYear),
        studentName: form.studentName,
        schoolName: form.schoolName,
        board: form.board || null,
        totalMarks: form.totalMarks ? Number(form.totalMarks) : null,
        marksObtained: form.marksObtained ? Number(form.marksObtained) : null,
        grade: form.grade || null,
        reportCardUrl: form.reportCardUrl || null,
        studentPhotoUrl: form.studentPhotoUrl || null,
        parentContactNumber: form.parentContactNumber || null,
        classroomTutor: form.classroomTutor || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const editing = mode === 'edit';
  return (
    <Modal show={open} onClose={onClose} size="4xl" dismissible={!saving}>
      <ModalHeader>{editing ? 'Edit Legacy Board Result' : 'Create Legacy Board Result'}</ModalHeader>
      <ModalBody className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Year of Passing" required>
              <TextInput type="number" min="1900" max="2100" value={form.passingYear} onChange={(event) => update('passingYear', event.target.value)} required />
            </Field>
            <Field label="Name of the Student" required>
              <TextInput value={form.studentName} onChange={(event) => update('studentName', event.target.value)} required />
            </Field>
            <Field label="School Name" required>
              <TextInput value={form.schoolName} onChange={(event) => update('schoolName', event.target.value)} required />
            </Field>
            <Field label="Board">
              <TextInput value={form.board} onChange={(event) => update('board', event.target.value)} placeholder="e.g. CBSE" />
            </Field>
            <Field label="Grade">
              <TextInput value={form.grade} onChange={(event) => update('grade', event.target.value)} placeholder="e.g. A1 / First Division" />
            </Field>
            <Field label="Total Marks">
              <TextInput type="number" min="0" step="0.01" value={form.totalMarks} onChange={(event) => update('totalMarks', event.target.value)} />
            </Field>
            <Field label="Marks Obtained">
              <TextInput type="number" min="0" step="0.01" value={form.marksObtained} onChange={(event) => update('marksObtained', event.target.value)} />
            </Field>
            <Field label="Percentage">
              <TextInput value={percentage ? `${percentage}%` : '—'} readOnly />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Report Card Upload (link)">
              <TextInput type="url" value={form.reportCardUrl} onChange={(event) => update('reportCardUrl', event.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Student Photo Upload (link)">
              <TextInput type="url" value={form.studentPhotoUrl} onChange={(event) => update('studentPhotoUrl', event.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Parent Contact Number">
              <TextInput type="tel" value={form.parentContactNumber} onChange={(event) => update('parentContactNumber', event.target.value)} />
            </Field>
            <Field label="Classroom ID and Tutor Name">
              <TextInput value={form.classroomTutor} onChange={(event) => update('classroomTutor', event.target.value)} />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <Button color="gray" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button color="blue" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Result'}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}{required ? ' *' : ''}</Label>
      {children}
    </div>
  );
}

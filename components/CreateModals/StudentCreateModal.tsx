"use client";

import ClassroomSelect from "@/components/CrudControls/ClassroomSelect";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  TextInput,
} from "flowbite-react";
import React, { useEffect, useState } from "react";

type FormState = {
  student_id?: string;
  name: string;
  rollNo: string;
  aadhaarNo: string;
  gender: string;
  dob: string;
  category: string;
  schoolName: string;
  schoolType: string;
  standard: string; // <-- ADDED
  fatherName: string;
  motherName: string;
  parentPhone: string;
  streetAddress: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  admissionDate: string;
  // classroom assignment
  classroomId: string;
  classroomLabel: string;
  joinDate: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  rollNo: "",
  aadhaarNo: "",
  gender: "",
  dob: "",
  category: "",
  schoolName: "",
  schoolType: "",
  standard: "", // <-- ADDED
  fatherName: "",
  motherName: "",
  parentPhone: "",
  streetAddress: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  admissionDate: "",
  classroomId: "",
  classroomLabel: "",
  joinDate: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialValues?: Partial<FormState> & { id?: string; activeAssignment?: any };
  onCreate?: (payload: any) => void;
  onUpdate?: (studentId: string, payload: any) => void;
}

export default function StudentCreateModal({
  open,
  onClose,
  mode = "create",
  initialValues,
  onCreate,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<
    "personal" | "school" | "address" | "classroom"
  >("personal");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialValues) {
      setForm({
        student_id: initialValues.id ?? "",
        name: initialValues.name ?? "",
        rollNo: initialValues.rollNo ?? "",
        aadhaarNo: initialValues.aadhaarNo ?? "",
        gender: initialValues.gender ?? "",
        dob: initialValues.dob ? initialValues.dob.toString().slice(0, 10) : "",
        category: initialValues.category ?? "",
        schoolName: initialValues.schoolName ?? "",
        schoolType: initialValues.schoolType ?? "",
        standard: initialValues.standard ?? "", // <-- ADDED
        fatherName: initialValues.fatherName ?? "",
        motherName: initialValues.motherName ?? "",
        parentPhone: initialValues.parentPhone ?? "",
        streetAddress: initialValues.streetAddress ?? "",
        city: initialValues.city ?? "",
        district: initialValues.district ?? "",
        state: initialValues.state ?? "",
        pincode: initialValues.pincode ?? "",
        admissionDate: initialValues.admissionDate
          ? initialValues.admissionDate.toString().slice(0, 10)
          : "",
        classroomId: initialValues.activeAssignment?.classroomId ?? "",
        classroomLabel: initialValues.activeAssignment?.classroom?.code ?? "",
        joinDate: initialValues.activeAssignment?.joinDate
          ? initialValues.activeAssignment.joinDate.toString().slice(0, 10)
          : "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setActiveTab("personal");
  }, [open, mode, initialValues]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name.trim(),
      rollNo: form.rollNo.trim(),
      aadhaarNo: form.aadhaarNo.trim() || null,
      gender: form.gender || null,
      dob: form.dob || null,
      category: form.category || null,
      schoolName: form.schoolName.trim() || null,
      schoolType: form.schoolType || null,
      standard: form.standard.trim() || null, // <-- ADDED
      fatherName: form.fatherName.trim() || null,
      motherName: form.motherName.trim() || null,
      parentPhone: form.parentPhone.trim() || null,
      streetAddress: form.streetAddress.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      state: form.state.trim() || null,
      pincode: form.pincode.trim() || null,
      admissionDate: form.admissionDate || null,
    };

    if (form.classroomId) {
      payload.classroomId = form.classroomId;
      payload.joinDate = form.joinDate || new Date().toISOString().slice(0, 10);
    }

    if (mode === "edit" && onUpdate && form.student_id) {
      onUpdate(form.student_id, payload);
    } else if (mode === "create" && onCreate) {
      onCreate(payload);
    }
    onClose();
  };

  const isEdit = mode === "edit";

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "personal", label: "Personal" },
    { key: "school", label: "School" },
    { key: "address", label: "Address" },
    { key: "classroom", label: "Classroom" },
  ];

  return (
    <Modal
      show={open}
      onClose={onClose}
      size="4xl" // Increased width for PC
      dismissible
      className="backdrop-blur-sm"
      position="center"
    >
      <ModalHeader>{isEdit ? "Edit Student" : "Add New Student"}</ModalHeader>
      <ModalBody className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Responsive Tab Navigation */}
          <div className="flex flex-col sm:flex-row border-b-0 sm:border-b border-gray-200 dark:border-gray-700 gap-1 sm:overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`w-full text-left sm:w-auto sm:text-center px-4 py-3 sm:py-2 text-sm font-medium transition-colors border-l-4 sm:border-l-0 sm:border-b-2 rounded-r-lg sm:rounded-none ${
                  activeTab === t.key
                    ? "border-blue-600 bg-blue-50/50 sm:bg-transparent text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-gray-500 hover:bg-gray-50 sm:hover:bg-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Personal Tab */}
          {activeTab === "personal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="mb-1 block">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Enter student's full name"
                />
              </div>
              <div>
                <Label htmlFor="rollNo" className="mb-1 block">
                  Roll No <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  id="rollNo"
                  required
                  value={form.rollNo}
                  onChange={(e) => set("rollNo", e.target.value)}
                  placeholder="Unique roll number"
                />
              </div>
              <div>
                <Label htmlFor="aadhaarNo" className="mb-1 block">
                  Aadhaar No
                </Label>
                <TextInput
                  id="aadhaarNo"
                  value={form.aadhaarNo}
                  onChange={(e) => set("aadhaarNo", e.target.value)}
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                />
              </div>
              <div>
                <Label htmlFor="gender" className="mb-1 block">
                  Gender
                </Label>
                <Select
                  id="gender"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  aria-label="Select Gender"
                >
                  <option value="">SELECT GENDER</option>
                  <option value="M">MALE</option>
                  <option value="F">FEMALE</option>
                  <option value="O">OTHERS</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="dob" className="mb-1 block">
                  Date of Birth
                </Label>
                <TextInput
                  id="dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => set("dob", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category" className="mb-1 block">
                  Category
                </Label>
                <Select
                  id="category"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  aria-label="Select Category"
                >
                  <option value="">SELECT CATEGORY</option>
                  <option value="GENERAL">GENERAL</option>
                  <option value="EWS">EWS</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="admissionDate" className="mb-1 block">
                  Admission Date
                </Label>
                <TextInput
                  id="admissionDate"
                  type="date"
                  value={form.admissionDate}
                  onChange={(e) => set("admissionDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fatherName" className="mb-1 block">
                  Father's Name
                </Label>
                <TextInput
                  id="fatherName"
                  value={form.fatherName}
                  onChange={(e) => set("fatherName", e.target.value)}
                  placeholder="Father's full name"
                />
              </div>
              <div>
                <Label htmlFor="motherName" className="mb-1 block">
                  Mother's Name
                </Label>
                <TextInput
                  id="motherName"
                  value={form.motherName}
                  onChange={(e) => set("motherName", e.target.value)}
                  placeholder="Mother's full name"
                />
              </div>
              <div>
                <Label htmlFor="parentPhone" className="mb-1 block">
                  Parent Phone
                </Label>
                <TextInput
                  id="parentPhone"
                  value={form.parentPhone}
                  onChange={(e) => set("parentPhone", e.target.value)}
                  placeholder="10-digit phone number"
                  maxLength={10}
                />
              </div>
            </div>
          )}

          {/* School Tab */}
          {activeTab === "school" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="schoolName" className="mb-1 block">
                  School Name
                </Label>
                <TextInput
                  id="schoolName"
                  value={form.schoolName}
                  onChange={(e) => set("schoolName", e.target.value)}
                  placeholder="Name of school"
                />
              </div>
              <div>
                <Label htmlFor="schoolType" className="mb-1 block">
                  School Type
                </Label>
                <Select
                  id="schoolType"
                  value={form.schoolType}
                  onChange={(e) => set("schoolType", e.target.value)}
                  aria-label="Select School Type"
                >
                  <option value="">SELECT SCHOOL TYPE</option>
                  <option value="GOVERNMENT">GOVERNMENT</option>
                  <option value="PRIVATE">PRIVATE</option>
                  <option value="GOVT_AIDED">GOVT AIDED</option>
                </Select>
              </div>
              {/* NEW FIELD: Standard */}
              <div>
                <Label htmlFor="standard" className="mb-1 block">
                  Standard / Class
                </Label>
                <TextInput
                  id="standard"
                  value={form.standard}
                  onChange={(e) => set("standard", e.target.value)}
                  placeholder="e.g. Class 10, XII, etc."
                />
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="streetAddress" className="mb-1 block">
                  Street Address
                </Label>
                <TextInput
                  id="streetAddress"
                  value={form.streetAddress}
                  onChange={(e) => set("streetAddress", e.target.value)}
                  placeholder="House no, street, locality"
                />
              </div>
              <div>
                <Label htmlFor="city" className="mb-1 block">
                  City
                </Label>
                <TextInput
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="district" className="mb-1 block">
                  District
                </Label>
                <TextInput
                  id="district"
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  placeholder="District"
                />
              </div>
              <div>
                <Label htmlFor="state" className="mb-1 block">
                  State
                </Label>
                <TextInput
                  id="state"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="pincode" className="mb-1 block">
                  Pincode
                </Label>
                <TextInput
                  id="pincode"
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
              </div>
            </div>
          )}

          {/* Classroom Tab */}
          {activeTab === "classroom" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="mb-1 block">Assign to Classroom</Label>
                <ClassroomSelect
                  value={
                    form.classroomId
                      ? { id: form.classroomId, label: form.classroomLabel }
                      : null
                  }
                  onChange={(v) => {
                    set("classroomId", v?.id ?? "");
                    set("classroomLabel", v?.label ?? "");
                  }}
                  placeholder="Search and select a classroom..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty if classroom is not yet assigned.
                </p>
              </div>
              {form.classroomId && (
                <div>
                  <Label htmlFor="joinDate" className="mb-1 block">
                    Join Date
                  </Label>
                  <TextInput
                    id="joinDate"
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => set("joinDate", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 sm:flex-row sm:justify-end">
            <Button
              color="gray"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" color="blue" className="w-full sm:w-auto">
              {isEdit ? "Save Changes" : "Create Student"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

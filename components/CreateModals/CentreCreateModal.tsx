"use client";

import StateSelect from "@/components/CrudControls/StateSelect";
import { ALL_STATE_OPTIONS } from "@/libs/geo/stateCodes";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import React, { useEffect, useState } from "react";

type Status = "Active" | "Inactive";

type FormState = {
  centre_id?: string;
  name: string;
  street_address: string;
  city: string;
  district: string;
  state: string; // now stores full state name, e.g., "Karnataka"
  pincode: string;
  status: Status;
  date_associated: string;
  date_left: string;
};

interface Props {
  open: boolean;
  onClose: () => void;

  onCreate?: (payload: Omit<FormState, "centre_id">) => void;

  mode?: "create" | "edit";
  initialValues?: Partial<FormState>;
  onUpdate?: (centre_id: string, payload: Omit<FormState, "centre_id">) => void;
}

const EMPTY_FORM: FormState = {
  name: "",
  street_address: "",
  city: "",
  district: "",
  state: "", // full name
  pincode: "",
  status: "Active",
  date_associated: "",
  date_left: "",
};

export default function CentreCreateModal({
  open,
  onClose,
  onCreate,
  mode = "create",
  initialValues,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // When modal opens, prefill for edit, else reset for create
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      setForm({
        centre_id: initialValues.centre_id || "",
        name: initialValues.name || "",
        street_address: initialValues.street_address || "",
        city: initialValues.city || "",
        district: initialValues.district || "",
        // Accept either a full name or a code from incoming data; normalize to full name
        state: (() => {
          const incoming = initialValues.state || "";
          if (!incoming) return "";
          const byCode = ALL_STATE_OPTIONS.find(
            (o) => o.code === incoming
          )?.name;
          return byCode || incoming; // if already full name, keep it
        })(),
        pincode: initialValues.pincode || "",
        status: (initialValues.status as Status) || "Active",
        date_associated: initialValues.date_associated || "",
        date_left: initialValues.date_left || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: keyof FormState, value: string | Status) =>
    setForm((prev) => ({ ...prev, [field]: value as any }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { centre_id, ...payload } = form;

    if (mode === "edit" && onUpdate && centre_id) {
      onUpdate(centre_id, payload);
    } else if (mode === "create" && onCreate) {
      onCreate(payload);
    }

    onClose();
  };

  const isEdit = mode === "edit";

  return (
    <Modal show={open} onClose={onClose} size="lg" dismissible color="light">
      <ModalHeader>{isEdit ? "Edit Centre" : "Create New Centre"}</ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-white">
              Centre Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded border px-3 py-2 text-white"
              placeholder="Enter Centre Name"
            />
          </div>

          {/* Street Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-white">
              Street Address
            </label>
            <input
              required
              value={form.street_address}
              onChange={(e) => handleChange("street_address", e.target.value)}
              className="w-full rounded border px-3 py-2 text-white"
              placeholder="Enter Street Address"
            />
          </div>

          {/* City & District */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                City
              </label>
              <input
                required
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full rounded border px-3 py-2 text-white"
                placeholder="Enter City"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                District
              </label>
              <input
                required
                value={form.district}
                onChange={(e) => handleChange("district", e.target.value)}
                className="w-full rounded border px-3 py-2 text-white"
                placeholder="Enter District"
              />
            </div>
          </div>

          {/* State & Pincode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                State
              </label>
              <StateSelect
                value={form.state || null} // full name
                onChange={(fullName) => handleChange("state", fullName || "")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Pincode
              </label>
              <input
                required
                title="6-digit pincode"
                value={form.pincode}
                onChange={(e) => handleChange("pincode", e.target.value)}
                className="w-full rounded border px-3 py-2 text-white"
                placeholder="Enter Pincode"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value as Status)}
              className="w-full rounded border px-3 py-2"
              aria-label="Select Status"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Date Associated
              </label>
              <input
                type="date"
                required
                value={form.date_associated}
                onChange={(e) =>
                  handleChange("date_associated", e.target.value)
                }
                className="w-full rounded border px-3 py-2"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">
                Date Left (optional)
              </label>
              <input
                type="date"
                value={form.date_left}
                onChange={(e) => handleChange("date_left", e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-gray-200 px-4 py-2 text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {isEdit ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

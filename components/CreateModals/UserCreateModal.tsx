"use client";

import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import React, { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;

  // Create flow
  onCreate?: (payload: Omit<FormState, "user_id">) => void;

  // Edit flow
  mode?: "create" | "edit";
  initialValues?: Partial<FormState>;
  onUpdate?: (user_id: string, payload: Omit<FormState, "user_id">) => void;
}

type RoleOption = "Tutor" | "Facilitator" | "Employee" | "Admin";

type FormState = {
  // user_id generated server-side for create; present when editing
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "ACTIVE" | "INACTIVE";
  roles: RoleOption[];
};

const ALL_ROLES: RoleOption[] = [
  "Tutor",
  "Facilitator",
  "Employee",
  "Admin",
];

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "ACTIVE",
  roles: [],
};

export default function UserCreateModal({
  open,
  onClose,
  onCreate,
  mode = "create",
  initialValues,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Prefill on edit, reset on create
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      setForm({
        user_id: initialValues.user_id || "",
        name: initialValues.name || "",
        email: initialValues.email || "",
        phone: initialValues.phone || "",
        address: initialValues.address || "",
        status: (initialValues.status as FormState["status"]) || "ACTIVE",
        roles: toRoleArray(
          (initialValues as any).rolesPlain ?? initialValues.roles
        ),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, initialValues]);

  /* helpers */
  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleRole = (role: RoleOption) => {
    setForm((prev) => {
      const exists = prev.roles.includes(role);
      return {
        ...prev,
        roles: exists
          ? prev.roles.filter((r) => r !== role)
          : [...prev.roles, role],
      };
    });
  };

  function toRoleArray(value: any): RoleOption[] {
    // Already a string[] (or array-like) → coerce each to a valid RoleOption if possible
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
        .filter(Boolean)
        .map((v) => v as RoleOption);
    }

    // CSV string → split → trim → cast
    if (typeof value === "string" && value.trim().length) {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((v) => v as RoleOption);
    }

    // Array of objects like [{ role_name: "Tutor" }] → extract and cast
    if (value && Array.isArray(value?.data)) {
      return value.data
        .map((r: any) => (r?.role_name ?? r?.name ?? "").toString().trim())
        .filter(Boolean)
        .map((v: string) => v as RoleOption);
    }

    // Generic object array fallback
    if (Array.isArray(value) && value.length && typeof value[0] === "object") {
      return value
        .map((r: any) =>
          (r?.role_name ?? r?.name ?? r?.value ?? "").toString().trim()
        )
        .filter(Boolean)
        .map((v: string) => v as RoleOption);
    }

    return [];
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { user_id, ...payload } = form;

    if (mode === "edit" && onUpdate && user_id) {
      onUpdate(user_id, payload);
    } else if (mode === "create" && onCreate) {
      onCreate(payload);
    }

    onClose();
  };

  const isEdit = mode === "edit";

  return (
    <Modal show={open} onClose={onClose} size="lg" dismissible color="light">
      <ModalHeader>{isEdit ? "Edit User" : "Create New User"}</ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1 text-white">
              Full Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded border px-3 py-2 text-white"
              placeholder="Enter full name"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">
                Email
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded border px-3 py-2 text-black"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">
                Phone
              </label>
              <input
                required
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full rounded border px-3 py-2 text-white"
                placeholder="10-digit number"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium mb-1 text-white">
              Address
            </label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full rounded border px-3 py-2 text-black"
              placeholder="Street, City, State, Pincode"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1 text-white">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as FormState["status"])
              }
              className="w-full rounded border px-3 py-2"
              aria-label="Select Status"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Assign Roles
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm text-white"
                >
                  <input
                    type="checkbox"
                    checked={
                      Array.isArray(form.roles) && form.roles.includes(role)
                    }
                    onChange={() => toggleRole(role)}
                  />
                  {role}
                </label>
              ))}
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

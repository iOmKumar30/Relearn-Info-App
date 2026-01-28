"use client";

import { ALL_ROLES, AppRole, ROLE_LABELS } from "@/libs/roles";
import {
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";
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

type FormState = {
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "ACTIVE" | "INACTIVE";
  roles: AppRole[]; // use canonical role type
  gender: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "ACTIVE",
  roles: [],
  gender: "",
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
          (initialValues as any).rolesPlain ?? initialValues.roles,
        ),
        gender: initialValues.gender || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, initialValues]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleRole = (role: AppRole) => {
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

  function toRoleArray(value: any): AppRole[] {
    // Array of strings
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
        .filter((v) =>
          (ALL_ROLES as readonly string[]).includes(v),
        ) as AppRole[];
    }
    // CSV string
    if (typeof value === "string" && value.trim().length) {
      const arr = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return arr.filter((v) =>
        (ALL_ROLES as readonly string[]).includes(v),
      ) as AppRole[];
    }
    // Array of objects with role_name/name/value
    if (Array.isArray(value) && value.length && typeof value[0] === "object") {
      const arr = value
        .map((r: any) =>
          (r?.role_name ?? r?.name ?? r?.value ?? "").toString().trim(),
        )
        .filter(Boolean);
      return arr.filter((v) =>
        (ALL_ROLES as readonly string[]).includes(v),
      ) as AppRole[];
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
    <Modal
      show={open}
      onClose={onClose}
      size="lg"
      dismissible
      className="backdrop-blur-sm"
      position="center"
    >
      <ModalHeader>{isEdit ? "Edit User" : "Create New User"}</ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label className="mb-1 block">Full Name</Label>
            <TextInput
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Email</Label>
              <TextInput
                required
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <Label className="mb-1 block">Phone</Label>
              <TextInput
                required
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="10-digit number"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="mb-1 block">Address</Label>
            <Textarea
              rows={3}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Street, City, State, Pincode"
            />
          </div>
          {/* Gender */}
          <div>
            <Label className="mb-1 block">Gender</Label>
            <Select
              value={form.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              aria-label="Select Gender"
            >
              <option value="" disabled hidden>
                SELECT GENDER
              </option>
              <option value="M">MALE</option>
              <option value="F">FEMALE</option>
              <option value="O">OTHERS</option>
            </Select>
          </div>
          {/* Status */}
          <div>
            <Label className="mb-1 block">Status</Label>
            <Select
              value={form.status}
              onChange={(e) =>
                handleChange("status", e.target.value as FormState["status"])
              }
              aria-label="Select Status"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </div>

          {/* Roles */}
          <div>
            <Label className="mb-2 block">Assign Roles</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_ROLES.map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={
                      Array.isArray(form.roles) && form.roles.includes(role)
                    }
                    onChange={() => toggleRole(role)}
                  />
                  <Label htmlFor={`role-${role}`}>{ROLE_LABELS[role]}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="blue">
              {isEdit ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

"use client";

import { ALL_ROLES, AppRole, ROLE_LABELS } from "@/libs/roles";
import {
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from "flowbite-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  user: any | null; // expects { id, email, name, currentRoles }
  onAssigned: () => void; // callback after success
}

export default function RoleAssignModal({
  open,
  onClose,
  user,
  onAssigned,
}: Props) {
  const [selected, setSelected] = useState<AppRole[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setSelected([]);
    setErr(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    // Optionally preselect roles based on some UI logic
    setSelected([]);
    setErr(null);
  }, [open, user?.id]);

  const toggle = (r: AppRole) => {
    setSelected((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handleAssign = async () => {
    if (!user?.id) return;
    if (selected.length === 0) {
      setErr("Select at least one role to assign");
      return;
    }
    try {
      setSubmitting(true);
      setErr(null);
      const res = await fetch(
        `/api/admin/users/${user.id}/approve-role-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: selected }),
        }
      );
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to assign roles");
      }
      onAssigned();
      reset();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  function formatRoles(val: unknown): string {
    if (!val) return "";
    if (Array.isArray(val)) {
      const arr = val
        .map((v) =>
          typeof v === "string"
            ? v.trim()
            : String((v as any)?.name ?? (v as any)?.role ?? v)
        )
        .filter((v) => (ALL_ROLES as readonly string[]).includes(v))
        .map((v) => ROLE_LABELS[v as AppRole]);
      return arr.join(", ");
    }
    if (typeof val === "string") {
      const v = val.trim();
      return (ALL_ROLES as readonly string[]).includes(v)
        ? ROLE_LABELS[v as AppRole]
        : v;
    }
    try {
      const maybeArray =
        (val as any)?.data ?? (val as any)?.roles ?? (val as any)?.currentRoles;
      if (Array.isArray(maybeArray)) {
        return maybeArray
          .map((v) =>
            typeof v === "string"
              ? v
              : String((v as any)?.name ?? (v as any)?.role ?? "")
          )
          .filter((v) => (ALL_ROLES as readonly string[]).includes(v))
          .map((v) => ROLE_LABELS[v as AppRole])
          .join(", ");
      }
    } catch {}
    return "";
  }

  return (
    <Modal
      show={open}
      onClose={handleClose}
      size="md"
      dismissible
      className="backdrop-blur-sm"
      position="center"
    >
      <ModalHeader>Assign Roles</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">
                User:
              </span>{" "}
              {user?.name || "—"}
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">
                Email:
              </span>{" "}
              {user?.email || "—"}
            </div>
            <div className="mt-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                Current roles:
              </span>{" "}
              {formatRoles(user?.currentRoles) || "None"}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {ALL_ROLES.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Checkbox
                  id={`assign-role-${r}`}
                  checked={selected.includes(r)}
                  onChange={() => toggle(r)}
                />
                <Label
                  htmlFor={`assign-role-${r}`}
                  className="uppercase cursor-pointer"
                >
                  {ROLE_LABELS[r]}
                </Label>
              </div>
            ))}
          </div>

          {err && (
            <div className="rounded border border-red-400 bg-red-50 p-2 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/50 dark:text-red-400">
              {err}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button color="light" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={handleAssign}
              disabled={submitting || selected.length === 0}
            >
              Assign
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}

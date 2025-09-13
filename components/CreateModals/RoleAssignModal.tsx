"use client";

import {
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from "flowbite-react";
import { useState } from "react";

// Keep aligned with your RoleName enum on backend
const ALL_ROLES = ["TUTOR", "FACILITATOR", "RELF_EMPLOYEE", "ADMIN"] as const;
type RoleName = (typeof ALL_ROLES)[number];

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
  const [selected, setSelected] = useState<RoleName[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset on user/open change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reset = () => {
    setSelected([]);
    setErr(null);
  };

  // Close with reset
  const handleClose = () => {
    reset();
    onClose();
  };

  const toggle = (r: RoleName) => {
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
    // Already an array of strings
    if (Array.isArray(val)) {
      const arr = val
        .map((v) =>
          typeof v === "string"
            ? v
            : String((v as any)?.name ?? (v as any)?.role ?? v)
        )
        .filter(Boolean);
      return arr.join(", ");
    }
    // If it's a string, return as-is
    if (typeof val === "string") return val;
    // If it's an object like [{ role: { name: "ADMIN" } }] passed incorrectly
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
          .filter(Boolean)
          .join(", ");
      }
    } catch {}
    return "";
  }
  return (
    <Modal show={open} onClose={handleClose} size="md" dismissible>
      <ModalHeader>Assign Roles</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            <div>
              <span className="font-semibold">User:</span> {user?.name || "—"}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {user?.email || "—"}
            </div>
            <div className="mt-2">
              <span className="font-semibold">Current roles:</span>{" "}
              {formatRoles(user?.currentRoles) || "None"}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(r)}
                  onChange={() => toggle(r)}
                />
                <Label className="uppercase">{r}</Label>
              </label>
            ))}
          </div>

          {err && (
            <div className="rounded border border-red-400 bg-red-50 p-2 text-sm text-red-700">
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

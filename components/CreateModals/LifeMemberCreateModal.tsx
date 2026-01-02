"use client";

import { getDynamicFiscalYears } from "@/libs/fiscalYears";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { useEffect, useMemo, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  pan: string;
  joiningDate: string;
  fees: Record<string, string>;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  pan: "",
  joiningDate: "",
  fees: {},
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialValues?: any;
  onCreate?: (payload: FormState) => Promise<void>;
  onUpdate?: (id: string, payload: FormState) => Promise<void>;
};

export default function LifeMemberCreateModal({
  open,
  onClose,
  mode = "create",
  initialValues,
  onCreate,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const fiscalYears = useMemo(() => getDynamicFiscalYears(2020), []);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      const name = initialValues.user?.name || initialValues.name || "";
      const email = initialValues.user?.email || initialValues.email || "";
      const phone = initialValues.user?.phone || initialValues.phone || "";

      let feesObj: Record<string, string> = {};
      if (initialValues.feesMap) {
        feesObj = initialValues.feesMap;
      }

      setForm({
        name,
        email,
        phone,
        pan: initialValues.pan || "",
        joiningDate: initialValues.joiningDate
          ? new Date(initialValues.joiningDate).toISOString().slice(0, 10)
          : "",
        fees: feesObj,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        joiningDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeeChange = (fiscalLabel: string, dateVal: string) => {
    setForm((prev) => ({
      ...prev,
      fees: { ...prev.fees, [fiscalLabel]: dateVal },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "create" && onCreate) {
        await onCreate(form);
      } else if (mode === "edit" && onUpdate && initialValues?.id) {
        await onUpdate(initialValues.id, form);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        {isEdit ? "Edit Life Member" : "Add Life Member"}
      </ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Details */}
            <div>
              <div className="mb-2 block">
                <Label htmlFor="name">Full Name</Label>
              </div>
              <TextInput
                id="name"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required={!isEdit}
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="email">Email Address</Label>
              </div>
              <TextInput
                id="email"
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                disabled={isEdit}
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="phone">Phone Number</Label>
              </div>
              <TextInput
                id="phone"
                placeholder="Mobile Number"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            {/* Member Details */}
            <div>
              <div className="mb-2 block">
                <Label htmlFor="pan">PAN Number</Label>
              </div>
              <TextInput
                id="pan"
                placeholder="ABCDE1234F"
                value={form.pan}
                onChange={(e) => handleChange("pan", e.target.value)}
              />
            </div>
            <div>
              <div className="mb-2 block">
                <Label htmlFor="joiningDate">Joining Date</Label>
              </div>
              <TextInput
                id="joiningDate"
                type="date"
                value={form.joiningDate}
                onChange={(e) => handleChange("joiningDate", e.target.value)}
                required
              />
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          <h4 className="text-md font-medium text-gray-900 mb-2">
            Membership Fee / Contribution Record
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fiscalYears.map((label) => {
              const val = form.fees[label]
                ? new Date(form.fees[label]).toISOString().slice(0, 10)
                : "";
              return (
                <div key={label}>
                  <div className="mb-2 block">
                    <Label htmlFor={`fee-${label}`}>{label}</Label>
                  </div>
                  <TextInput
                    id={`fee-${label}`}
                    type="date"
                    value={val}
                    onChange={(e) => handleFeeChange(label, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button color="gray" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" color="green" disabled={loading}>
              {loading
                ? "Processing..."
                : isEdit
                ? "Save Changes"
                : "Create Member"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

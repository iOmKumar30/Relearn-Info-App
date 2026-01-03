"use client";

import { getDynamicFiscalYears } from "@/libs/fiscalYears";
import { DEFAULT_MEMBER_FEES } from "@/libs/memberConstants";
import { MemberType } from "@prisma/client";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { useEffect, useMemo, useState } from "react";

// 1. Updated Form State Type
type FeeEntry = { date: string; amount: string };
type FormState = {
  name: string;
  email: string;
  phone: string;
  pan: string;
  joiningDate: string;
  fees: Record<string, FeeEntry>; // { "2023-2024": { date: "...", amount: "5000" } }
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
  onCreate?: (payload: any) => Promise<void>;
  onUpdate?: (id: string, payload: any) => Promise<void>;
};

export default function HonoraryMemberCreateModal({
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
  const defaultFee = DEFAULT_MEMBER_FEES[MemberType.HONORARY];

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      const name = initialValues.user?.name || initialValues.name || "";
      const email = initialValues.user?.email || initialValues.email || "";
      const phone = initialValues.user?.phone || initialValues.phone || "";

      // Transform incoming fee map (which might be simple date string or object from API)
      let feesObj: Record<string, FeeEntry> = {};

      // Assuming initialValues.feesMapFull contains { "2023-2024": { paidOn: "...", amount: 5000 } }
      // We will need to update the API/Page to pass this detailed map.
      if (initialValues.feesMapFull) {
        Object.entries(initialValues.feesMapFull).forEach(([fy, data]: any) => {
          feesObj[fy] = {
            date: data.paidOn
              ? new Date(data.paidOn).toISOString().slice(0, 10)
              : "",
            amount: data.amount ? String(data.amount) : String(defaultFee),
          };
        });
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
  }, [open, mode, initialValues, defaultFee]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeeChange = (
    fiscalLabel: string,
    field: "date" | "amount",
    value: string
  ) => {
    setForm((prev) => {
      const currentEntry = prev.fees[fiscalLabel] || {
        date: "",
        amount: String(defaultFee),
      };
      return {
        ...prev,
        fees: {
          ...prev.fees,
          [fiscalLabel]: { ...currentEntry, [field]: value },
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Transform fees to payload
    // Only include fees where date is set
    const feePayload: Record<string, { date: string; amount: number }> = {};
    Object.entries(form.fees).forEach(([fy, entry]) => {
      if (entry.date) {
        feePayload[fy] = {
          date: entry.date,
          amount: Number(entry.amount) || defaultFee,
        };
      }
    });

    const payload = {
      ...form,
      fees: feePayload,
    };

    try {
      if (mode === "create" && onCreate) {
        await onCreate(payload);
      } else if (mode === "edit" && onUpdate && initialValues?.id) {
        await onUpdate(initialValues.id, payload);
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
    <Modal
      show={open}
      onClose={onClose}
      size="6xl"
      position="center"
      dismissible
      className="backdrop-blur-sm"
    >
      {" "}
      <ModalHeader>
        {isEdit ? "Edit Honorary Member" : "Add Honorary Member"}
      </ModalHeader>
      <ModalBody className="overflow-y-auto max-h-[80vh] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <TextInput
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required={!isEdit}
              />
            </div>
            <div>
              <Label>Email</Label>
              <TextInput
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                disabled={isEdit}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <TextInput
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div>
              <Label>PAN</Label>
              <TextInput
                value={form.pan}
                onChange={(e) => handleChange("pan", e.target.value)}
              />
            </div>
            <div>
              <Label>Joining Date</Label>
              <TextInput
                type="date"
                value={form.joiningDate}
                onChange={(e) => handleChange("joiningDate", e.target.value)}
                required
              />
            </div>
          </div>

          <hr className="my-4 border-gray-200" />

          <h4 className="text-md font-medium text-white mb-2">
            Membership Fee Payments
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fiscalYears.map((label) => {
              const entry = form.fees[label] || {
                date: "",
                amount: String(defaultFee),
              };
              return (
                <div key={label} className="p-3 border rounded bg-gray-50">
                  <div className="mb-2 font-semibold text-sm text-gray-700">
                    {label}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <TextInput
                        type="date"
                        className="text-xs"
                        sizing="sm"
                        value={entry.date}
                        onChange={(e) =>
                          handleFeeChange(label, "date", e.target.value)
                        }
                      />
                    </div>
                    <div className="w-24">
                      <TextInput
                        type="number"
                        placeholder="Amt"
                        className="text-xs"
                        sizing="sm"
                        value={entry.amount}
                        onChange={(e) =>
                          handleFeeChange(label, "amount", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button color="gray" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" color="purple" disabled={loading}>
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

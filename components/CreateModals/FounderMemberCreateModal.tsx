"use client";

import { getDynamicFiscalYears } from "@/libs/fiscalYears";
import { DEFAULT_MEMBER_FEES } from "@/libs/memberConstants";
import { toLocalDateInput } from "@/libs/toLocalDateInput";
import { MemberType } from "@prisma/client";
import { Plus } from "lucide-react";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { useEffect, useMemo, useState } from "react";
import AddMemberFeeAmountModal from "./AddMemberFeeAmountModal";

type FeeEntry = { date: string; amount: string };

type FormState = {
  name: string;
  email: string;
  phone: string;
  pan: string;
  joiningDate: string;
  fees: Record<string, FeeEntry>;
};

// 2. Define Empty Form Constant
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

export default function FounderMemberCreateModal({
  open,
  onClose,
  mode = "create",
  initialValues,
  onCreate,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [feeToAdd, setFeeToAdd] = useState<string | null>(null);
  const configuredFiscalYears = useMemo(() => getDynamicFiscalYears(2020), []);
  const defaultFee = DEFAULT_MEMBER_FEES[MemberType.FOUNDER];

  // Include any legacy labels already saved for a founder so editing the
  // member cannot silently hide or discard older fee records.
  const fiscalYears = useMemo(
    () =>
      Array.from(
        new Set([...configuredFiscalYears, ...Object.keys(form.fees)]),
      ).sort((a, b) => a.localeCompare(b)),
    [configuredFiscalYears, form.fees],
  );

  // 3. Effect to Handle Modal Open/Close & Data Population
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      const name = initialValues.user?.name || initialValues.name || "";
      const email = initialValues.user?.email || initialValues.email || "";
      const phone = initialValues.user?.phone || initialValues.phone || "";

      const fees: Record<string, FeeEntry> = {};
      Object.entries(initialValues.feesMapFull || {}).forEach(
        ([fiscalLabel, fee]: [string, any]) => {
          fees[fiscalLabel] = {
            date: fee.paidOn ? toLocalDateInput(fee.paidOn) : "",
            amount:
              fee.amount === null || fee.amount === undefined
                ? String(defaultFee)
                : String(fee.amount),
          };
        },
      );

      setForm({
        name,
        email,
        phone,
        pan: initialValues.pan || "",
        joiningDate: initialValues.joiningDate
          ? new Date(initialValues.joiningDate).toISOString().slice(0, 10)
          : "",
        fees,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        joiningDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, mode, initialValues, defaultFee]);

  // 4. Unified Change Handler
  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeeChange = (
    fiscalLabel: string,
    field: keyof FeeEntry,
    value: string,
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

  const addFeeAmount = (amount: number) => {
    if (!feeToAdd) return;

    setForm((prev) => {
      const currentEntry = prev.fees[feeToAdd] || {
        date: "",
        amount: String(defaultFee),
      };
      const currentAmount = Number(currentEntry.amount);
      const total = Math.round(((Number.isFinite(currentAmount) ? currentAmount : 0) + amount) * 100) / 100;
      return {
        ...prev,
        fees: {
          ...prev.fees,
          [feeToAdd]: { ...currentEntry, amount: String(total) },
        },
      };
    });
  };

  // 5. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fees: Record<string, { date: string | null; amount: number | null }> =
      {};
    fiscalYears.forEach((fiscalLabel) => {
      const entry = form.fees[fiscalLabel] || {
        date: "",
        amount: String(defaultFee),
      };
      fees[fiscalLabel] = {
        date: entry.date || null,
        amount: entry.amount ? Number(entry.amount) || null : null,
      };
    });

    try {
      const payload = { ...form, fees };
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
    <>
    <Modal show={open} onClose={onClose} size="6xl">
      <ModalHeader>
        {isEdit ? "Edit Founder Member" : "Add Founder Member"}
      </ModalHeader>
      <ModalBody className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
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
            <div className="md:col-span-2">
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

          <hr className="border-gray-200" />

          <section aria-labelledby="founder-fees-heading">
            <h4
              id="founder-fees-heading"
              className="mb-2 text-md font-medium text-black dark:text-white"
            >
              Membership Fee Payments
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {fiscalYears.map((fiscalLabel) => {
                const entry = form.fees[fiscalLabel] || {
                  date: "",
                  amount: String(defaultFee),
                };
                return (
                  <div
                    key={fiscalLabel}
                    className="rounded border bg-gray-50 p-3"
                  >
                    <div className="mb-2 text-sm font-semibold text-gray-700">
                      {fiscalLabel}
                    </div>
                    <div className="flex gap-2">
                      <TextInput
                        aria-label={`${fiscalLabel} payment date`}
                        type="date"
                        className="flex-1 text-xs"
                        sizing="sm"
                        value={entry.date}
                        onChange={(event) =>
                          handleFeeChange(
                            fiscalLabel,
                            "date",
                            event.target.value,
                          )
                        }
                      />
                      <TextInput
                        aria-label={`${fiscalLabel} payment amount`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        className="w-28 text-xs"
                        sizing="sm"
                        value={entry.amount}
                        onChange={(event) =>
                          handleFeeChange(
                            fiscalLabel,
                            "amount",
                            event.target.value,
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="xs"
                        color="light"
                        className="px-2"
                        disabled={!entry.date}
                        title={
                          entry.date
                            ? "Add another payment amount"
                            : "Enter the payment date first"
                        }
                        aria-label={`Add another payment for ${fiscalLabel}`}
                        onClick={() => setFeeToAdd(fiscalLabel)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button color="gray" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" color="blue" disabled={loading}>
              {loading
                ? "Processing..."
                : isEdit
                ? "Save Changes"
                : "Create Founder"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
    <AddMemberFeeAmountModal
      open={feeToAdd !== null}
      fiscalLabel={feeToAdd}
      currentAmount={
        feeToAdd ? Number(form.fees[feeToAdd]?.amount ?? defaultFee) || 0 : 0
      }
      onClose={() => setFeeToAdd(null)}
      onConfirm={addFeeAmount}
    />
    </>
  );
}

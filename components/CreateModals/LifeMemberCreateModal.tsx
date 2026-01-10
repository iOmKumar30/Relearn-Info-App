"use client";

import { getDynamicFiscalYears } from "@/libs/fiscalYears";
import { DEFAULT_MEMBER_FEES } from "@/libs/memberConstants";
import { toLocalDateInput } from "@/libs/toLocalDateInput";
import { MemberType } from "@prisma/client";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// 1. Updated Form State Type
type FeeEntry = { date: string; amount: string };

// New History Entry Type
type HistoryEntry = {
  id?: string; // Optional for new rows
  memberType: MemberType;
  startDate: string;
  endDate: string;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  pan: string;
  joiningDate: string;
  fees: Record<string, FeeEntry>;
  memberType: MemberType;
  history: HistoryEntry[];
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  pan: "",
  joiningDate: "",
  fees: {},
  memberType: MemberType.LIFE, // Default
  history: [],
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialValues?: any;
  onCreate?: (payload: any) => Promise<void>;
  onUpdate?: (id: string, payload: any) => Promise<void>;
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
  // Track original type to detect changes
  const [originalType, setOriginalType] = useState<MemberType>(MemberType.LIFE);

  const fiscalYears = useMemo(() => getDynamicFiscalYears(2020), []);
  const defaultFee = DEFAULT_MEMBER_FEES[MemberType.LIFE];
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      const name = initialValues.user?.name || initialValues.name || "";
      const email = initialValues.user?.email || initialValues.email || "";
      const phone = initialValues.user?.phone || initialValues.phone || "";

      // Transform incoming fee map
      let feesObj: Record<string, FeeEntry> = {};
      if (initialValues.feesMapFull) {
        Object.entries(initialValues.feesMapFull).forEach(([fy, data]: any) => {
          feesObj[fy] = {
            date: data.paidOn ? toLocalDateInput(data.paidOn) : "",
            amount: data.amount ? String(data.amount) : String(defaultFee),
          };
        });
      }

      // Transform History
      const historyRows = (initialValues.typeHistory || []).map((h: any) => ({
        id: h.id,
        memberType: h.memberType,
        startDate: h.startDate ? toLocalDateInput(h.startDate) : "",
        endDate: h.endDate ? toLocalDateInput(h.endDate) : "",
      }));

      const currentType = initialValues.memberType || MemberType.LIFE;
      setOriginalType(currentType);

      setForm({
        name,
        email,
        phone,
        pan: initialValues.pan || "",
        joiningDate: initialValues.joiningDate
          ? toLocalDateInput(initialValues.joiningDate)
          : "",
        fees: feesObj,
        memberType: currentType,
        history: historyRows,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        joiningDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, mode, initialValues, defaultFee]);

  const handleChange = (field: keyof FormState, value: any) => {
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

  // --- History Handlers ---
  const addHistoryRow = () => {
    setForm((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        { memberType: MemberType.LIFE, startDate: "", endDate: "" },
      ],
    }));
  };

  const removeHistoryRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      history: prev.history.filter((_, i) => i !== index),
    }));
  };

  const updateHistoryRow = (
    index: number,
    field: keyof HistoryEntry,
    value: string
  ) => {
    setForm((prev) => {
      const newHistory = [...prev.history];
      newHistory[index] = { ...newHistory[index], [field]: value };
      return { ...prev, history: newHistory };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const feePayload: Record<string, { date: string; amount: number }> = {};
    Object.entries(form.fees).forEach(([fy, entry]) => {
      if (entry.date) {
        feePayload[fy] = {
          date: entry.date,
          amount: Number(entry.amount) || defaultFee,
        };
      }
    });

    // --- AUTO-GENERATE HISTORY ON TYPE CHANGE ---
    let finalHistory = [...form.history];

    // Logic: If user changed the type dropdown, enforce history updates
    if (isEdit && form.memberType !== originalType) {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Close current active history
      finalHistory = finalHistory.map((h) => {
        if (!h.endDate) {
          return { ...h, endDate: today };
        }
        return h;
      });

      // 2. Add new history entry
      finalHistory.push({
        memberType: form.memberType,
        startDate: today,
        endDate: "", // Open-ended
      });
    }

    // Prepare History Payload
    const historyPayload = finalHistory.map((h) => ({
      ...h,
      startDate: h.startDate ? `${h.startDate}T00:00:00.000Z` : null,
      endDate: h.endDate ? `${h.endDate}T00:00:00.000Z` : null,
    }));

    const payload = {
      ...form,
      fees: feePayload,
      typeHistory: historyPayload,
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

  return (
    <Modal
      show={open}
      onClose={onClose}
      size="6xl"
      position="center"
      dismissible
      className="backdrop-blur-sm"
    >
      <ModalHeader>
        {isEdit ? "Edit Life Member" : "Add Life Member"}
      </ModalHeader>
      <ModalBody className="overflow-y-auto max-h-[80vh] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- Identity Section --- */}
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

            {/* NEW: Member Type Selector */}
            {isEdit && (
              <div className="p-2">
                <Label
                  htmlFor="memberType"
                  className="text-green-800 font-semibold"
                >
                  Current Member Type
                </Label>
                <Select
                  id="memberType"
                  value={form.memberType}
                  onChange={(e) => handleChange("memberType", e.target.value)}
                  className="mt-1"
                >
                  <option value={MemberType.ANNUAL}>Annual</option>
                  <option value={MemberType.LIFE}>Life</option>
                  <option value={MemberType.HONORARY}>Honorary</option>
                </Select>
                <p className="text-xs text-green-600 mt-1">
                  Changing this will auto-update history upon save.
                </p>
              </div>
            )}
          </div>

          <hr className="my-4 border-gray-200" />

          {/* --- Fees Section --- */}
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

          {/* --- Member Type History Section --- */}
          <hr className="my-6 border-gray-200" />

          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-medium text-white">
              Member Type History
            </h4>
            <Button size="xs" color="light" onClick={addHistoryRow}>
              <Plus className="w-4 h-4 mr-1" /> Add History
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Member Type</TableHeadCell>
                  <TableHeadCell>Start Date</TableHeadCell>
                  <TableHeadCell>End Date</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {form.history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-500 py-4"
                    >
                      No history records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  form.history.map((row, index) => (
                    <TableRow key={index} className="bg-white">
                      <TableCell>
                        <Select
                          value={row.memberType}
                          onChange={(e) =>
                            updateHistoryRow(
                              index,
                              "memberType",
                              e.target.value
                            )
                          }
                          sizing="sm"
                        >
                          <option value={MemberType.ANNUAL}>Annual</option>
                          <option value={MemberType.LIFE}>Life</option>
                          <option value={MemberType.HONORARY}>Honorary</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextInput
                          type="date"
                          sizing="sm"
                          value={row.startDate}
                          onChange={(e) =>
                            updateHistoryRow(index, "startDate", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextInput
                          type="date"
                          sizing="sm"
                          value={row.endDate}
                          onChange={(e) =>
                            updateHistoryRow(index, "endDate", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => removeHistoryRow(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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

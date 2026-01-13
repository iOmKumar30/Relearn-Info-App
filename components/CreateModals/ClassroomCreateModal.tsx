"use client";

import StateSelect from "@/components/CrudControls/StateSelect";
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

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Status = "Active" | "Inactive";

// Extended form state to carry a deterministic centre_id selected via autocomplete
type FormState = {
  classroom_id: string; // normalized to string, never undefined
  centre_id: string; // normalized to string, never undefined
  centre_name: string;
  section_code: string; // "Junior" | "Senior" | "BOTH"
  street_address: string;
  city: string;
  district: string;
  state: string; // stores full state name (e.g., "Karnataka")
  pincode: string;
  monthly_allowance: number | ""; // controlled-safe for number input
  timing: string; // "Morning" | "Evening"
  status: Status;
  date_created: string; // YYYY-MM-DD
  date_closed: string; // YYYY-MM-DD or ""
};

interface Props {
  open: boolean;
  onClose: () => void;

  // Create flow
  onCreate?: (payload: Omit<FormState, "classroom_id">) => void;

  // Edit flow
  mode?: "create" | "edit";
  initialValues?: Partial<FormState>;
  onUpdate?: (
    classroom_id: string,
    payload: Omit<FormState, "classroom_id">
  ) => void;
}

const EMPTY_FORM: FormState = {
  classroom_id: "",
  centre_id: "",
  centre_name: "",
  section_code: "",
  street_address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  monthly_allowance: "",
  timing: "",
  status: "Active",
  date_created: "",
  date_closed: "",
};

type CentreHit = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  state: string; // assumed full state name in your API results
};

export default function ClassroomCreateModal({
  open,
  onClose,
  onCreate,
  mode = "create",
  initialValues,
  onUpdate,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Autocomplete search term and results
  const [centreQuery, setCentreQuery] = useState<string>("");
  const debouncedCentreQuery = useDebounce(centreQuery, 300);
  const [centreLoading, setCentreLoading] = useState<boolean>(false);
  const [centreItems, setCentreItems] = useState<CentreHit[]>([]);
  const [centreOpen, setCentreOpen] = useState<boolean>(false);

  // Normalize helpers
  function normStr(v: unknown): string {
    return typeof v === "string" ? v : "";
  }
  function normNumOrEmpty(v: unknown): number | "" {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
    return "";
  }

  // Prefill for edit; reset for create
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialValues) {
      setForm({
        classroom_id: normStr(initialValues.classroom_id),
        centre_id: normStr(initialValues.centre_id),
        centre_name: normStr(initialValues.centre_name),
        section_code: normStr(initialValues.section_code),
        street_address: normStr(initialValues.street_address),
        city: normStr(initialValues.city),
        district: normStr(initialValues.district),
        state: normStr(initialValues.state), // full state name preserved
        pincode: normStr(initialValues.pincode),
        monthly_allowance: normNumOrEmpty(initialValues.monthly_allowance),
        timing: normStr(initialValues.timing),
        status: (initialValues.status as Status) || "Active",
        date_created: normStr(initialValues.date_created),
        date_closed: normStr(initialValues.date_closed),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, initialValues]);

  // Fetch centres for autocomplete when dropdown is open and query changes
  useEffect(() => {
    if (!centreOpen) return;
    const q = debouncedCentreQuery.trim();
    (async () => {
      setCentreLoading(true);
      try {
        const url = new URL("/api/admin/centres", window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "10");
        if (q) url.searchParams.set("q", q);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setCentreItems(Array.isArray(json.rows) ? json.rows : []);
        } else {
          setCentreItems([]);
        }
      } catch {
        setCentreItems([]);
      } finally {
        setCentreLoading(false);
      }
    })();
  }, [debouncedCentreQuery, centreOpen]);

  // Helpers
  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { classroom_id, monthly_allowance, ...rest } = form;

    const parsedAllowance =
      monthly_allowance === ""
        ? 0
        : Number.isFinite(monthly_allowance)
        ? (monthly_allowance as number)
        : 0;

    const payload: Omit<FormState, "classroom_id"> = {
      ...rest,
      centre_id: form.centre_id.trim(),
      centre_name: form.centre_name.trim(),
      monthly_allowance: parsedAllowance,
    };

    if (mode === "edit" && onUpdate && classroom_id) {
      onUpdate(classroom_id, payload);
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
      className="backdrop-blur-sm z-100"
      position="center"
    >
      <ModalHeader>
        {isEdit ? "Edit Classroom" : "Create New Classroom"}
      </ModalHeader>
      <ModalBody className="overflow-y-auto max-h-[80vh] p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Centre (autocomplete) */}
          <div className="relative">
            <Label className="mb-1 block">Centre</Label>
            <TextInput
              value={centreOpen ? centreQuery : form.centre_name}
              onChange={(e) => setCentreQuery(e.target.value)}
              onFocus={() => {
                setCentreOpen(true);
                setCentreQuery("");
              }}
              placeholder="Type to search centres..."
              required
              autoComplete="off"
            />
            {centreOpen && (
              <div className="absolute z-50 mt-1 w-full rounded border bg-white shadow dark:bg-gray-700 dark:border-gray-600">
                <div className="p-2">
                  {centreLoading ? (
                    <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                      Searching…
                    </div>
                  ) : centreItems.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                      No results
                    </div>
                  ) : (
                    <ul className="max-h-60 overflow-auto">
                      {centreItems.map((c) => {
                        const label = `${c.code} — ${c.name}${
                          c.city ? `, ${c.city}` : ""
                        } (${c.state})`;
                        return (
                          <li
                            key={c.id}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                centre_id: c.id,
                                centre_name: label,
                                // Optionally prefill address/state if you want:
                                // state: c.state,
                                // city: c.city ?? prev.city,
                              }));
                              setCentreOpen(false);
                            }}
                          >
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="border-t p-2 text-right dark:border-gray-600">
                  <button
                    type="button"
                    className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-600 dark:text-white"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        centre_id: "",
                        centre_name: "",
                      }));
                      setCentreOpen(false);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Street Address */}
          <div>
            <Label className="mb-1 block">Street Address</Label>
            <TextInput
              required
              value={form.street_address}
              onChange={(e) => handleChange("street_address", e.target.value)}
              placeholder="Enter Street Address"
            />
          </div>

          {/* City & District */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block">City</Label>
              <TextInput
                required
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Enter City"
              />
            </div>
            <div>
              <Label className="mb-1 block">District</Label>
              <TextInput
                required
                value={form.district}
                onChange={(e) => handleChange("district", e.target.value)}
                placeholder="Enter District"
              />
            </div>
          </div>

          {/* State & Pincode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block">State</Label>
              <StateSelect
                value={form.state || null} // full state name
                onChange={(fullName) => handleChange("state", fullName || "")}
              />
            </div>
            <div>
              <Label className="mb-1 block">Pincode</Label>
              <TextInput
                required
                title="6-digit pincode"
                value={form.pincode}
                onChange={(e) => handleChange("pincode", e.target.value)}
                placeholder="Enter Pincode"
              />
            </div>
          </div>

          {/* Section Code & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Section Code</Label>
              <Select
                title="Section"
                required
                value={form.section_code}
                onChange={(e) => handleChange("section_code", e.target.value)}
              >
                <option value="" disabled>
                  Select section
                </option>
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
                <option value="Both">Both</option>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Timing</Label>
              <Select
                title="Timing"
                required
                value={form.timing}
                onChange={(e) => handleChange("timing", e.target.value)}
              >
                <option value="" disabled>
                  Select timing
                </option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </Select>
            </div>
          </div>

          {/* Monthly Allowance */}
          <div>
            <Label className="mb-1 block">Monthly Allowance (₹)</Label>
            <TextInput
              required
              type="number"
              min={0}
              value={
                form.monthly_allowance === "" ? "" : form.monthly_allowance
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  handleChange("monthly_allowance", "");
                } else {
                  const n = Number(v);
                  handleChange(
                    "monthly_allowance",
                    Number.isFinite(n) ? n : ""
                  );
                }
              }}
              placeholder="Enter Amount"
            />
          </div>

          {/* Status */}
          <div>
            <Label className="mb-1 block">Status</Label>
            <Select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value as Status)}
              aria-label="Select Status"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Date Created</Label>
              <TextInput
                type="date"
                required
                value={form.date_created}
                onChange={(e) => handleChange("date_created", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <Label className="mb-1 block">Date Closed (optional)</Label>
              <TextInput
                type="date"
                value={form.date_closed}
                onChange={(e) => handleChange("date_closed", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="blue" disabled={!form.centre_id}>
              {isEdit ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

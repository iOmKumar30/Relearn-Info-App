"use client";

import {
  Button,
  Datepicker,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
  Textarea,
} from "flowbite-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: any;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export default function DonationFormModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialValues) {
        setForm({
          ...initialValues,
          date: new Date(initialValues.date),
        });
      } else {
        // Defaults
        setForm({
          receiptNumber: "",
          date: new Date(),
          name: "",
          email: "",
          contact: "",
          address: "",
          pan: "",
          amount: "",
          reason: "Voluntary Contribution",
          method: "UPI",
          transactionId: "",
        });
      }
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount), // Ensure number
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Helper for datepicker
  const safeDate = (d: any) => {
    if (!d) return undefined;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        {mode === "create" ? "Create Donation Receipt" : "Edit Donation"}
      </ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Receipt Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Receipt No (Auto if empty)</Label>
              <TextInput
                value={form.receiptNumber || ""}
                onChange={(e) => handleChange("receiptNumber", e.target.value)}
                placeholder="e.g. RELF/DON/001"
              />
            </div>
            <div>
              <Label>
                Date <span className="text-red-500">*</span>
              </Label>
              <Datepicker
                value={safeDate(form.date) || new Date()}
                onChange={(date) => handleChange("date", date)}
              />
            </div>
          </div>

          {/* Row 2: Donor Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Donor Name <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                value={form.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Email <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                type="email"
                value={form.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Mobile No <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                value={form.contact || ""}
                onChange={(e) => handleChange("contact", e.target.value)}
              />
            </div>
            <div>
              <Label>PAN No</Label>
              <TextInput
                value={form.pan || ""}
                onChange={(e) => handleChange("pan", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Address (Full Width) */}
          <div>
            <Label>
              Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              required
              rows={2}
              value={form.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          {/* Row 4: Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                type="number"
                value={form.amount || ""}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <TextInput
                required
                value={form.method || ""}
                onChange={(e) => handleChange("method", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Transaction / Cheque No <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                value={form.transactionId || ""}
                onChange={(e) => handleChange("transactionId", e.target.value)}
              />
            </div>
            <div>
              <Label>Purpose/Reason</Label>
              <TextInput
                value={form.reason || ""}
                onChange={(e) => handleChange("reason", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} color="blue">
              {mode === "create" ? "Generate Receipt" : "Update"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

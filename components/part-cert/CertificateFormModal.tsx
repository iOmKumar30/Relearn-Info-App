"use client";

import {
  Button,
  Datepicker,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: any;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export default function CertificateFormModal({
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
      setForm(
        mode === "edit" && initialValues
          ? { ...initialValues }
          : {
              certificateNo: "",
              name: "",
              aadhaar: "",
              classYear: "",
              institute: "",
              duration: "",
              startDate: new Date(),
              endDate: new Date(),
            }
      );
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const safeDate = (d: any) => {
    if (!d) return undefined;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };
  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        {mode === "create"
          ? "Create Participation Certificate"
          : "Edit Certificate"}
      </ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ROW 1: Cert No & Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Certificate No (Optional)</Label>
              <TextInput
                placeholder="Auto-generated if empty"
                value={form.certificateNo || ""}
                onChange={(e) => handleChange("certificateNo", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Participant Name <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                value={form.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
          </div>

          {/* ROW 2: Aadhaar & Institute */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Aadhaar Number</Label>
              <TextInput
                placeholder="xxxx xxxx xxxx"
                value={form.aadhaar || ""}
                onChange={(e) => handleChange("aadhaar", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Institute / Organization <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                value={form.institute || ""}
                onChange={(e) => handleChange("institute", e.target.value)}
              />
            </div>
          </div>

          {/* ROW 3: Class & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Class / Year / Designation{" "}
                <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                placeholder="e.g. B.Tech 3rd Year / Volunteer"
                value={form.classYear || ""}
                onChange={(e) => handleChange("classYear", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Duration Text <span className="text-red-500">*</span>
              </Label>
              <TextInput
                required
                placeholder="e.g. 2 weeks, 100 hours"
                value={form.duration || ""}
                onChange={(e) => handleChange("duration", e.target.value)}
              />
            </div>
          </div>

          {/* ROW 4: Dates */}
          {/* ROW 4: Dates - Full width, 3 equal columns */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <Label className="mb-2">Start Date</Label>
              <Datepicker
                className="w-full"
                value={safeDate(form.startDate)}
                onChange={(date) => handleChange("startDate", date)}
              />
            </div>

            <div className="flex flex-col">
              <Label className="mb-2">End Date</Label>
              <Datepicker
                className="w-full"
                value={safeDate(form.endDate)}
                onChange={(date) => handleChange("endDate", date)}
              />
            </div>

            <div className="flex flex-col">
              <Label className="mb-2">Issue Date (on certificate)</Label>
              <Datepicker
                className="w-full"
                value={safeDate(form.issueDate) || new Date()}
                onChange={(date) => handleChange("issueDate", date)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} color="blue">
              {mode === "create" ? "Generate Certificate" : "Update Details"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

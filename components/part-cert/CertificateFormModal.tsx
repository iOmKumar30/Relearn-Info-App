"use client";

import {
  Button,
  Datepicker,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
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

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm(
        mode === "edit" && initialValues
          ? { ...initialValues }
          : {
              type: initialValues?.type,
              certificateNo: "",
              name: "",
              aadhaar: "",
              classYear: "",
              institute: "",
              eventName: "",
              duration: "",
              startDate: new Date(),
              endDate: new Date(),
              issueDate: new Date(),
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

  const isTraining = form.type === "TRAINING";

  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        {mode === "create" ? "Create Certificate" : "Edit Certificate"}
      </ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ROW 0: Certificate Type Selector */}
          <div>
            <Label>Certificate Type</Label>
            <Select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              required
            >
              <option value="PARTICIPATION">Participation Certificate</option>
              <option value="INTERNSHIP">Internship Certificate</option>
              <option value="TRAINING">Training/Workshop Certificate</option>
            </Select>
          </div>

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
                {isTraining ? "Employee Name" : "Participant Name"}{" "}
                <span className="text-red-500">*</span>
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
                placeholder="12-digit Aadhaar Number"
                value={form.aadhaar || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d{0,12}$/.test(val)) {
                    handleChange("aadhaar", val);
                  }
                }}
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

          {/* ROW 3: Conditional Fields based on Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Class/Year: Hide for Training */}
            {!isTraining && (
              <div>
                <Label>
                  Class / Year / Designation{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  required={!isTraining}
                  placeholder="e.g. B.Tech 3rd Year / Volunteer"
                  value={form.classYear || ""}
                  onChange={(e) => handleChange("classYear", e.target.value)}
                />
              </div>
            )}

            {/* Event Name: Show ONLY for Training */}
            {isTraining && (
              <div>
                <Label>
                  Event / Workshop Name <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  required={isTraining}
                  placeholder="e.g. Solar Panel Installation Workshop"
                  value={form.eventName || ""}
                  onChange={(e) => handleChange("eventName", e.target.value)}
                />
              </div>
            )}

            {/* Duration: Required for others, Optional for Training (usually implied by dates) */}
            <div>
              <Label>
                Duration Text{" "}
                {!isTraining && <span className="text-red-500">*</span>}
              </Label>
              <TextInput
                required={!isTraining}
                placeholder="e.g. 2 weeks, 100 hours"
                value={form.duration || ""}
                onChange={(e) => handleChange("duration", e.target.value)}
              />
            </div>
          </div>

          {/* ROW 4: Dates */}
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

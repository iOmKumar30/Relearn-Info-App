"use client";

import { UploadButton } from "@/libs/uploadthing"; // The helper we made
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: any;
  onClose: () => void;
  onCreate?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => Promise<void>;
};

export default function ProjectCreateModal({
  open,
  mode,
  initialValues,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (open) {
      setForm(
        mode === "edit" && initialValues
          ? { ...initialValues }
          : { status: "ONGOING", funds: 0 } // Defaults
      );
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: string, val: string | number) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "create" && onCreate) await onCreate(form);
      else if (mode === "edit" && onUpdate) await onUpdate(form.id, form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        {mode === "create" ? "Add Project" : "Edit Project"}
      </ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Project Title</Label>
              <TextInput
                required
                value={form.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status || "ONGOING"}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="PLANNED">Planned</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
              </Select>
            </div>
            <div>
              <Label>Year (e.g. 2024-26)</Label>
              <TextInput
                value={form.year || ""}
                onChange={(e) => handleChange("year", e.target.value)}
              />
            </div>
            <div>
              <Label>Funds (in Lakhs)</Label>
              <TextInput
                type="number"
                step="0.01"
                value={form.funds || ""}
                onChange={(e) => handleChange("funds", e.target.value)}
              />
            </div>
            <div>
              <Label>Sponsored By</Label>
              <TextInput
                value={form.sponsoredBy || ""}
                onChange={(e) => handleChange("sponsoredBy", e.target.value)}
              />
            </div>
            <div>
              <Label>Place</Label>
              <TextInput
                value={form.place || ""}
                onChange={(e) => handleChange("place", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Mentors</Label>
              <TextInput
                placeholder="Dr. A, Mr. B"
                value={form.mentors || ""}
                onChange={(e) => handleChange("mentors", e.target.value)}
              />
            </div>
            <div>
              <Label>Target Group</Label>
              <TextInput
                value={form.targetGroup || ""}
                onChange={(e) => handleChange("targetGroup", e.target.value)}
              />
            </div>
            <div>
              <Label>Beneficiaries</Label>
              <TextInput
                value={form.beneficiaries || ""}
                onChange={(e) => handleChange("beneficiaries", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Conclusion</Label>
              <Textarea
                rows={2}
                value={form.conclusion || ""}
                onChange={(e) => handleChange("conclusion", e.target.value)}
              />
            </div>
            <div>
              <Label>Next Steps</Label>
              <Textarea
                rows={2}
                value={form.nextSteps || ""}
                onChange={(e) => handleChange("nextSteps", e.target.value)}
              />
            </div>
          </div>

          {/* PDF UPLOAD SECTION */}
          <div className="border p-4 rounded ">
            <Label className="mb-2 block text-black">
              Project Report (PDF)
            </Label>

            {form.reportUrl ? (
              <div className="flex items-center gap-4">
                <a
                  href={form.reportUrl}
                  target="_blank"
                  className="text-blue-600 underline text-sm"
                >
                  View Uploaded Report
                </a>
                <Button
                  size="xs"
                  color="failure"
                  onClick={() => handleChange("reportUrl", "")}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <UploadButton
                endpoint="projectReport"
                // 1. CUSTOM STYLING HERE
                appearance={{
                  button:
                    "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed rounded-md bg-blue-600 text-white bg-none after:bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-4",
                  container:
                    "w-full flex-row rounded-md border-cyan-300 p-y-6 hover:border-blue-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400",
                  allowedContent:
                    "flex h-8 flex-col items-center justify-center px-2 text-white py-4",
                }}
                onClientUploadComplete={(res) => {
                  if (res?.[0]) {
                    handleChange("reportUrl", res[0].url);
                    toast.success("Report uploaded successfully");
                  }
                }}
                onUploadError={(error: Error) => {
                  toast.error("Upload failed. Please try again.");
                  console.log(`ERROR! ${error.message}`);
                }}
              />
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600" disabled={loading}>
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}


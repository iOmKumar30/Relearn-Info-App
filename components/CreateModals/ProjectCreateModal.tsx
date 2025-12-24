"use client";

import { UploadButton } from "@/libs/uploadthing";
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
import { HiOutlineStar, HiStar } from "react-icons/hi"; // Icons for rating

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
          : { status: "ONGOING", funds: 0, rating: 0 } // Default rating 0
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

  // Helper function to render file upload sections (Avoids repeating code 4 times)
  const renderUploadField = (label: string, fieldKey: string) => (
    <div className="border p-4 rounded bg-gray-50 dark:bg-gray-800/50">
      <Label className="mb-2 block text-black dark:text-white font-medium">
        {label}
      </Label>

      {form[fieldKey] ? (
        <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border">
          <a
            href={form[fieldKey]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline text-sm truncate max-w-[200px]"
          >
            View Document
          </a>
          <Button
            size="xs"
            color="failure"
            onClick={() => handleChange(fieldKey, "")}
          >
            Remove
          </Button>
        </div>
      ) : (
        <UploadButton
          endpoint="projectReport" // Reusing your existing endpoint
          appearance={{
            button:
              "ut-ready:bg-blue-600 ut-uploading:cursor-not-allowed rounded-md bg-blue-600 text-white bg-none after:bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 w-full",
            container:
              "w-full flex-row rounded-md border-cyan-300 hover:border-blue-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400",
            allowedContent: "hidden", // Hide the "Pdf (8MB)" text to save space since we have 4 inputs
          }}
          content={{
            button({ ready }) {
              if (ready) return <div>Choose File</div>;
              return <div>Loading...</div>;
            },
          }}
          onClientUploadComplete={(res) => {
            if (res?.[0]) {
              handleChange(fieldKey, res[0].url);
              toast.success(`${label} uploaded`);
            }
          }}
          onUploadError={(error: Error) => {
            toast.error("Upload failed");
            console.log(`ERROR! ${error.message}`);
          }}
        />
      )}
    </div>
  );

  return (
    <Modal show={open} onClose={onClose} size="4xl">
      <ModalHeader>
        {mode === "create" ? "Add Project" : "Edit Project"}
      </ModalHeader>
      <ModalBody className="overflow-y-auto max-h-[75vh]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- TOP SECTION: Basic Info --- */}
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

          {/* --- STAR RATING SECTION --- */}
          <div>
            <Label className="mb-2 block">Project Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleChange("rating", star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= (form.rating || 0) ? (
                    <HiStar className="w-8 h-8 text-yellow-400" />
                  ) : (
                    <HiOutlineStar className="w-8 h-8 text-gray-400 hover:text-yellow-400" />
                  )}
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-500">
                ({form.rating || 0} / 5)
              </span>
            </div>
          </div>

          {/* --- MIDDLE SECTION: Team & Audience --- */}
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
              <Label>Project Coordinators & Team</Label>
              <TextInput
                value={form.beneficiaries || ""}
                onChange={(e) => handleChange("beneficiaries", e.target.value)}
              />
            </div>
          </div>

          {/* --- TEXT AREAS --- */}
          <div className="space-y-4">
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
          </div>

          <div className="space-y-2">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b pb-1">
              Project Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {renderUploadField("Project Proposal", "proposalUrl")}
              {renderUploadField("Approval Document", "approvalUrl")}
              {renderUploadField("Project Report (PDF)", "reportUrl")}
              {renderUploadField("Utilization Certificate", "utilizationUrl")}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600" disabled={loading}>
              {mode === "create" ? "Create Project" : "Save Changes"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}

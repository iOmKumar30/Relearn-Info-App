"use client";

import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
  TextInput,
} from "flowbite-react";
import { useEffect, useState } from "react";

type Mode = "create" | "edit";

interface InternCreateModalProps {
  open: boolean;
  mode: Mode;
  initialValues?: any;
  onClose: () => void;
  onCreate?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => Promise<void>;
}

// Helper to format date for input (YYYY-MM-DD)
const formatDateForInput = (dateStr: string | Date | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

export default function InternCreateModal({
  open,
  mode,
  initialValues,
  onClose,
  onCreate,
  onUpdate,
}: InternCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (open && mode === "edit" && initialValues) {
      setFormData({
        ...initialValues,
        dateOfBirth: formatDateForInput(initialValues.dateOfBirth),
        joiningDate: formatDateForInput(initialValues.joiningDate),
        completionDate: formatDateForInput(initialValues.completionDate),
        feePaidDate: formatDateForInput(initialValues.feePaidDate),
        // Ensure enums have valid defaults or empty strings
        gender: initialValues.gender || "",
        workingMode: initialValues.workingMode || "",
        status: initialValues.status || "ACTIVE",
        paymentStatus: initialValues.paymentStatus || "PENDING",
      });
    } else {
      setFormData({
        status: "ACTIVE",
        paymentStatus: "PENDING",
        associatedAfter: false,
      });
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean up empty strings to null for optional fields
      const payload = { ...formData };

      // Convert numeric fee
      // Convert numeric fee ("" -> null, "1000" -> 1000)
      payload.feeAmount =
        payload.feeAmount === "" || payload.feeAmount == null
          ? null
          : parseInt(payload.feeAmount);

      // Handle dates: empty string -> null
      ["dateOfBirth", "joiningDate", "completionDate", "feePaidDate"].forEach(
        (key) => {
          if (!payload[key]) payload[key] = null;
          else payload[key] = new Date(payload[key]);
        }
      );

      if (mode === "create" && onCreate) {
        await onCreate(payload);
      } else if (mode === "edit" && onUpdate && initialValues?.id) {
        await onUpdate(initialValues.id, payload);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert("An error occurred. Please check the form.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      size="4xl"
      position="center"
      dismissible
      className="backdrop-blur-sm"
    >
      <ModalHeader>
        {mode === "create" ? "Add New Intern" : "Edit Intern Details"}
      </ModalHeader>

      <ModalBody className="overflow-y-auto max-h-[80vh] p-6">
        <form id="intern-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="p-2">
            <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <TextInput
                  id="name"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <TextInput
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile</Label>
                <TextInput
                  id="mobile"
                  placeholder="+91 98765 43210"
                  value={formData.mobile || ""}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  id="gender"
                  value={formData.gender || ""}
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <TextInput
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth || ""}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  className="text-sm"
                  placeholder="Full residential address"
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Education & Interest */}
          <div className="p-2">
            <h3 className="text-sm font-bold text-white uppercase mb-3">
              Education & Interests
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="institution">Institution Name</Label>
                <TextInput
                  id="institution"
                  placeholder="e.g. NMIMS, Mumbai"
                  value={formData.institution || ""}
                  onChange={(e) => handleChange("institution", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ongoingCourse">Ongoing Course</Label>
                <TextInput
                  id="ongoingCourse"
                  placeholder="e.g. MBA, B.Tech"
                  value={formData.ongoingCourse || ""}
                  onChange={(e) =>
                    handleChange("ongoingCourse", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="educationCompleted">Education Completed</Label>
                <TextInput
                  id="educationCompleted"
                  placeholder="e.g. BCA, 12th Standard"
                  value={formData.educationCompleted || ""}
                  onChange={(e) =>
                    handleChange("educationCompleted", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="areasOfInterest">Areas of Interest</Label>
                <TextInput
                  id="areasOfInterest"
                  placeholder="e.g. Teaching, Web Dev"
                  value={formData.areasOfInterest || ""}
                  onChange={(e) =>
                    handleChange("areasOfInterest", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 3: Internship Details */}
          <div className="p-2">
            <h3 className="text-sm font-bold text-white uppercase mb-3">
              Internship Meta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={formData.status || "ACTIVE"}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING_START">Pending Start</option>
                  <option value="DROPPED">Dropped</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="workingMode">Working Mode</Label>
                <Select
                  id="workingMode"
                  value={formData.workingMode || ""}
                  onChange={(e) => handleChange("workingMode", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="ONSITE">On-Site</option>
                  <option value="REMOTE">Remote (WFH)</option>
                  <option value="HYBRID">Hybrid</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="preferredHours">Hours / Day</Label>
                <TextInput
                  id="preferredHours"
                  placeholder="e.g. 4 HOURS"
                  value={formData.preferredHoursPerDay || ""}
                  onChange={(e) =>
                    handleChange("preferredHoursPerDay", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="joiningDate">Joining Date</Label>
                <TextInput
                  id="joiningDate"
                  type="date"
                  value={formData.joiningDate || ""}
                  onChange={(e) => handleChange("joiningDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="completionDate">Completion Date</Label>
                <TextInput
                  id="completionDate"
                  type="date"
                  value={formData.completionDate || ""}
                  onChange={(e) =>
                    handleChange("completionDate", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="associatedAfter">
                  Interested in Future Association?
                </Label>
                <Select
                  id="associatedAfter"
                  value={formData.associatedAfter ? "YES" : "NO"}
                  onChange={(e) =>
                    handleChange("associatedAfter", e.target.value === "YES")
                  }
                >
                  <option value="" disabled hidden>
                    Select
                  </option>
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 4: Payment */}
          <div className="p-2">
            <h3 className="text-sm font-bold text-white uppercase mb-3">
              Payment Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  id="paymentStatus"
                  value={formData.paymentStatus || "PENDING"}
                  onChange={(e) =>
                    handleChange("paymentStatus", e.target.value)
                  }
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="WAIVED">Waived</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="feeAmount">Fee Amount (₹)</Label>
                <TextInput
                  id="feeAmount"
                  type="number"
                  placeholder="0"
                  value={formData.feeAmount || ""}
                  onChange={(e) => handleChange("feeAmount", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="feePaidDate">Paid On</Label>
                <TextInput
                  id="feePaidDate"
                  type="date"
                  value={formData.feePaidDate || ""}
                  onChange={(e) => handleChange("feePaidDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Comments */}
          <div>
            <Label htmlFor="comments">Comments / Notes</Label>
            <Textarea
              id="comments"
              rows={2}
              placeholder="Internal notes or user comments..."
              value={formData.comments || ""}
              onChange={(e) => handleChange("comments", e.target.value)}
            />
          </div>
        </form>
      </ModalBody>

      {/* Fixed Footer */}
      <ModalFooter className="flex justify-end gap-2 border-t border-gray-200">
        <Button color="gray" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="intern-form"
          color="blue"
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : mode === "create"
            ? "Create Intern"
            : "Save Changes"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

"use client";

import StudentCreateModal from "@/components/CreateModals/StudentCreateModal";
import RBACGate from "@/components/RBACGate";
import { Badge, Button, Card } from "flowbite-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";

type StudentDetail = {
  id: string;
  name: string;
  rollNo: string;
  aadhaarNo: string | null;
  gender: string | null;
  dob: string | null;
  category: string | null;
  schoolName: string | null;
  schoolType: string | null;
  standard: string | null;
  fatherName: string | null;
  motherName: string | null;
  parentPhone: string | null;
  streetAddress: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  admissionDate: string | null;
  createdAt: string;
  historicalTutor: { id: string; name: string } | null;
  assignments: Array<{
    id: string;
    classroomId: string;
    joinDate: string;
    leaveDate: string | null;
    status: "ACTIVE" | "LEFT";
    classroom: {
      id: string;
      code: string;
      centre: { code: string; name: string | null };
    };
  }>;
  boardResult: {
    id: string;
    passingYear: number;
    totalMarks: number;
    marksObtained: number;
    grade: string;
    spTutor: { id: string; name: string } | null;
  } | null;
};

const genderLabels: Record<string, string> = {
  M: "Male",
  F: "Female",
  O: "Others",
};
const schoolTypeLabels: Record<string, string> = {
  GOVERNMENT: "Govt",
  PRIVATE: "Private",
  GOVT_AIDED: "Govt Aided",
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col mb-3">
    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      {label}
    </dt>
    <dd className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
      {value || "—"}
    </dd>
  </div>
);

export default function StudentProfilePage(ctx: {
  params: Promise<{ studentId: string }>;
}) {
  const router = useRouter();
  const { studentId } = use(ctx.params);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchStudent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/students/${studentId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStudent(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load student details");
      toast.error("Failed to load student details");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  const handleUpdate = async (id: string, payload: any) => {
    const toastId = toast.loading("Updating student...");
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchStudent();
      setEditOpen(false);
      toast.success("Student updated successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update student", { id: toastId });
    }
  };

  if (loading && !student) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ClipLoader size={40} color="#6B7280" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
          {error || "Student not found"}
        </div>
        <Button
          color="light"
          className="mt-4"
          onClick={() => router.push("/students")}
        >
          Back to Students
        </Button>
      </div>
    );
  }

  const activeAssignment = student.assignments[0]; 

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/students")}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Back"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {student.name}
                </h1>
                <Badge color="info" className="text-sm px-2">
                  {student.rollNo}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Admitted On: {formatDate(student.admissionDate)}
              </p>
            </div>
          </div>
          <Button color="blue" onClick={() => setEditOpen(true)}>
            Edit Profile
          </Button>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Personal Details */}
          <Card className="shadow-sm border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b pb-2 mb-4">
              Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Aadhaar No" value={student.aadhaarNo} />
              <InfoItem
                label="Gender"
                value={genderLabels[student.gender ?? ""] || student.gender}
              />
              <InfoItem label="Date of Birth" value={formatDate(student.dob)} />
              <InfoItem label="Category" value={student.category} />
              <InfoItem
                label="Admission Date"
                value={formatDate(student.admissionDate)}
              />
            </div>
          </Card>

          {/* Family & Contact */}
          <Card className="shadow-sm border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b pb-2 mb-4">
              Family & Contact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Father's Name" value={student.fatherName} />
              <InfoItem label="Mother's Name" value={student.motherName} />
              <div className="col-span-2">
                <InfoItem label="Parent Phone" value={student.parentPhone} />
              </div>
            </div>
          </Card>

          {/* Address */}
          <Card className="shadow-sm border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b pb-2 mb-4">
              Address Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <InfoItem
                  label="Street Address"
                  value={student.streetAddress}
                />
              </div>
              <InfoItem label="City" value={student.city} />
              <InfoItem label="District" value={student.district} />
              <InfoItem label="State" value={student.state} />
              <InfoItem label="Pincode" value={student.pincode} />
            </div>
          </Card>

          {/* School Details */}
          <Card className="shadow-sm border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b pb-2 mb-4">
              School Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <InfoItem label="School Name" value={student.schoolName} />
              </div>
              <InfoItem
                label="School Type"
                value={
                  schoolTypeLabels[student.schoolType ?? ""] ||
                  student.schoolType
                }
              />
              <InfoItem label="Standard / Class" value={student.standard} />
            </div>
          </Card>

          {/* Classroom Assignment */}
          <Card className="shadow-sm border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b pb-2 mb-4 flex items-center justify-between">
              <span>Relearn Classroom</span>
              {activeAssignment && (
                <Badge
                  color={
                    activeAssignment.status === "ACTIVE" ? "success" : "failure"
                  }
                >
                  {activeAssignment.status}
                </Badge>
              )}
            </h3>
            {activeAssignment ? (
              <div className="grid grid-cols-2 gap-4">
                <InfoItem
                  label="Classroom Code"
                  value={activeAssignment.classroom.code}
                />
                <InfoItem
                  label="Centre"
                  value={`${activeAssignment.classroom.centre.code} - ${activeAssignment.classroom.centre.name}`}
                />
                <InfoItem
                  label="Join Date"
                  value={formatDate(activeAssignment.joinDate)}
                />
                <InfoItem
                  label="Assigned Tutor"
                  value={student.historicalTutor?.name || "No Tutor Assigned"}
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic py-4">
                This student is not assigned to any classroom.
              </div>
            )}
          </Card>

          {/* Board Exam Results (Conditional) */}
          {student.boardResult && (
            <Card className="shadow-sm border-gray-200 bg-linear-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800">
              <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800 pb-2 mb-4">
                Board Exam Results
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem
                  label="Passing Year"
                  value={student.boardResult.passingYear}
                />
                <InfoItem label="Grade" value={student.boardResult.grade} />
                <InfoItem
                  label="Marks Obtained"
                  value={student.boardResult.marksObtained}
                />
                <InfoItem
                  label="Total Marks"
                  value={student.boardResult.totalMarks}
                />
                <InfoItem
                  label="Percentage"
                  value={
                    student.boardResult.totalMarks
                      ? `${((student.boardResult.marksObtained / student.boardResult.totalMarks) * 100).toFixed(2)}%`
                      : "N/A"
                  }
                />
                <InfoItem
                  label="SP Tutor"
                  value={student.boardResult.spTutor?.name || "—"}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      <StudentCreateModal
        open={editOpen}
        mode="edit"
        initialValues={{
          ...student,
          activeAssignment: student.assignments[0] ?? null,
        }}
        onClose={() => setEditOpen(false)}
        onUpdate={handleUpdate}
      />
    </RBACGate>
  );
}

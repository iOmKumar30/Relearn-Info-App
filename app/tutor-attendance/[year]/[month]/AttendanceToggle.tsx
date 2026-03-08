"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { saveTutorAttendance, TrainingAttendanceStatus } from "../../actions";

interface Props {
  classId: string;
  tutorId: string;
  currentStatus?: TrainingAttendanceStatus;
}

export default function AttendanceToggle({
  classId,
  tutorId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (status: TrainingAttendanceStatus) => {
    if (status === currentStatus) return; // Don't save if it's the same

    startTransition(async () => {
      const result = await saveTutorAttendance(classId, tutorId, status);
      if (result.success) {
        router.refresh(); // Refresh to update payouts and scores
      } else {
        toast.error(result.error || "Failed to save attendance");
      }
    });
  };

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isPending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <button
        onClick={() => handleUpdate("ABSENT")}
        className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-all ${
          currentStatus === "ABSENT"
            ? "bg-red-500 text-white shadow-sm ring-2 ring-red-200"
            : "text-gray-500 hover:bg-red-100 hover:text-red-600"
        }`}
        title="Absent (₹0)"
      >
        A
      </button>

      <button
        onClick={() => handleUpdate("PRESENT")}
        className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-all ${
          currentStatus === "PRESENT"
            ? "bg-green-400 text-white shadow-sm ring-2 ring-green-200"
            : "text-gray-500 hover:bg-green-100 hover:text-green-600"
        }`}
        title="Present (₹50)"
      >
        P
      </button>

      <button
        onClick={() => handleUpdate("PRESENT_RESPONDED")}
        className={`w-10 h-8 flex items-center justify-center rounded-md font-bold text-[10px] transition-all ${
          currentStatus === "PRESENT_RESPONDED"
            ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-200"
            : "text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"
        }`}
        title="Present & Responded (₹75)"
      >
        P & R
      </button>
    </div>
  );
}

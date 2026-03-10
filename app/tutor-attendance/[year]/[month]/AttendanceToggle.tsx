"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import toast from "react-hot-toast";
import { saveTutorAttendance, TrainingAttendanceStatus } from "../../actions";

interface Props {
  classId: string;
  tutorId: string;
  currentStatus?: TrainingAttendanceStatus;
  currentRates: any;
}

export default function AttendanceToggle({
  classId,
  tutorId,
  currentStatus,
  currentRates,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticStatus, setOptimisticStatus] = useOptimistic<
    TrainingAttendanceStatus | undefined,
    TrainingAttendanceStatus
  >(currentStatus, (state, newStatus) => newStatus);

  const handleUpdate = (status: TrainingAttendanceStatus) => {
    if (status === currentStatus) return;

    startTransition(() => {
      setOptimisticStatus(status);
    });

    const saveToServer = async () => {
      const result = await saveTutorAttendance(classId, tutorId, status);

      if (result.success) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(result.error || "Failed to save attendance");
      }
    };

    saveToServer();
  };

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-200 dark:border-gray-700 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => handleUpdate("ABSENT")}
        disabled={isPending}
        className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-all ${
          optimisticStatus === "ABSENT"
            ? "bg-red-500 text-white shadow-sm ring-2 ring-red-200"
            : "text-gray-500 hover:bg-red-100 hover:text-red-600"
        }`}
        title={`Absent(₹${currentRates.absentAmount})`}
      >
        A
      </button>

      <button
        onClick={() => handleUpdate("PRESENT")}
        disabled={isPending}
        className={`w-8 h-8 flex items-center justify-center rounded-md font-bold text-xs transition-all ${
          optimisticStatus === "PRESENT"
            ? "bg-green-400 text-white shadow-sm ring-2 ring-green-200"
            : "text-gray-500 hover:bg-green-100 hover:text-green-600"
        }`}
        title={`Absent(₹${currentRates.presentAmount})`}
      >
        P
      </button>

      <button
        onClick={() => handleUpdate("PRESENT_RESPONDED")}
        disabled={isPending}
        className={`w-10 h-8 flex items-center justify-center rounded-md font-bold text-[10px] transition-all ${
          optimisticStatus === "PRESENT_RESPONDED"
            ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-200"
            : "text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"
        }`}
        title={`Present & Responded(₹${currentRates.presentResponded})`}
      >
        P & R
      </button>
    </div>
  );
}

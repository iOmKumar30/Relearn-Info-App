"use client";

import { Modal } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiXMark } from "react-icons/hi2";
import { addTrainingClass, updateTrainingClass } from "../../actions";

type Mode = "create" | "edit";

type InitialClass = {
  id: string;
  date: string | Date;
  trainingBy: string;
};

export default function AddClassModal({
  year,
  month,
  mode = "create",
  initialClass,
  trigger,
}: {
  year: number;
  month: number;
  mode?: Mode;
  initialClass?: InitialClass;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState("");
  const [trainingBy, setTrainingBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const formatDateForInput = (d: string | Date) => {
    const dt = typeof d === "string" ? new Date(d) : d;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const isDateInCurrentMonthYear = (value: string) => {
    if (!value) return false;
    const selected = new Date(value);

    const selectedYear = selected.getFullYear();
    const selectedMonth = selected.getMonth() + 1;

    return selectedYear === year && selectedMonth === month;
  };
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialClass) {
        setDate(formatDateForInput(initialClass.date));
        setTrainingBy(initialClass.trainingBy);
      } else {
        setDate("");
        setTrainingBy("");
      }
    }
  }, [isOpen, mode, initialClass]);

  const handleSubmit = async () => {
    if (!date || !trainingBy.trim())
      return toast.error("Please fill all fields");

    setIsSubmitting(true);
    const toastId = toast.loading(
      mode === "create" ? "Adding class..." : "Updating class...",
    );

    try {
      const result =
        mode === "create"
          ? await addTrainingClass(year, month, new Date(date), trainingBy)
          : await updateTrainingClass(
              year,
              month,
              initialClass!.id,
              new Date(date),
              trainingBy,
            );

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Class added successfully!"
            : "Class updated successfully!",
          { id: toastId },
        );
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Error", { id: toastId });
      }
    } catch (e) {
      toast.error("Unexpected error", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };
  const isFormValid =
    !!date &&
    !!trainingBy.trim() &&
    isDateInCurrentMonthYear(date) &&
    !dateError;
  return (
    <>
      {trigger ? (
        <span
          onClick={() => setIsOpen(true)}
          className="inline-block cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <HiPlus className="w-4 h-4" />
          Add Class
        </button>
      )}

      <Modal
        show={isOpen}
        onClose={() => setIsOpen(false)}
        size="md"
        popup
        theme={{
          content: {
            inner:
              "relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col w-full",
          },
        }}
      >
        <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === "create" ? "Add Training Class" : "Edit Training Class"}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <HiXMark className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Class Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  const value = e.target.value;
                  setDate(value);

                  if (!value) {
                    setDateError("Please choose a date.");
                    return;
                  }

                  if (!isDateInCurrentMonthYear(value)) {
                    setDateError(
                      "Choose a date within the selected month and year.",
                    );
                  } else {
                    setDateError(null);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {dateError && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <svg
                    className="h-4 w-4 mr-1 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.366-.772 1.42-.772 1.786 0l6.518 13.743A1 1 0 0115.66 18H4.34a1 1 0 01-.901-1.158L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V8a1 1 0 112 0v3a1 1 0 01-1 1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{dateError}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Training By
              </label>
              <input
                type="text"
                placeholder="Name of trainer"
                value={trainingBy}
                onChange={(e) => setTrainingBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3 mt-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? mode === "create"
                  ? "Adding..."
                  : "Updating..."
                : mode === "create"
                  ? "Add Class"
                  : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

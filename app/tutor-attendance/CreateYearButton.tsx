"use client";

import { Modal } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineAcademicCap, HiPlus } from "react-icons/hi";
import { HiXMark } from "react-icons/hi2";
import { createTutorTrainingYear } from "./actions"; 

export default function CreateYearButton({
  existingYears,
}: {
  existingYears: number[];
}) {
  const router = useRouter();
  const [isModalOpen, setModalOpen] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const yearNum = parseInt(newYear);

    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      setError("Please enter a valid year between 2020 and 2100");
      return;
    }

    if (existingYears.includes(yearNum)) {
      setError("This year already exists in the system");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating academic year...");

    try {
      const result = await createTutorTrainingYear(yearNum);

      if (result.success) {
        toast.success(`Academic Year ${yearNum} created!`, { id: toastId });
        setModalOpen(false);
        setNewYear("");
        router.refresh();
        router.push(`/tutor-attendance/${yearNum}`);
      } else {
        toast.error(result.error || "Failed to create year", { id: toastId });
        setError(result.error || "Failed to create year");
      }
    } catch (err) {
      toast.error("An unexpected error occurred", { id: toastId });
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="group relative flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-2xl shadow-sm hover:shadow-md hover:bg-gray-800 transition-all duration-200 active:scale-95"
      >
        <HiPlus className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />
        <span>Create New Year</span>
      </button>
      <Modal
        show={isModalOpen}
        onClose={() => {
          setModalOpen(false);
          setError("");
          setNewYear("");
        }}
        size="md"
        popup
        className="backdrop-blur-sm bg-gray-900/20 dark:bg-gray-900/60"
        theme={{
          content: {
            inner:
              "relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl flex flex-col w-full",
          },
        }}
      >
        <div className="p-1">
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <HiOutlineAcademicCap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                New Training Year
              </h3>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="year"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                >
                  Enter Year <span className="text-red-500">*</span>
                </label>
                <input
                  id="year"
                  type="number"
                  placeholder="e.g., 2026"
                  value={newYear}
                  onChange={(e) => {
                    setNewYear(e.target.value);
                    setError("");
                  }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    error
                      ? "border-red-300 dark:border-red-500/50 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-red-400"
                      : "border-gray-200 dark:border-gray-600 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-400"
                  } bg-gray-50/50 dark:bg-gray-700 text-gray-900 dark:text-white text-lg transition-all focus:ring-4 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-400`}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500 dark:bg-red-400"></span>
                    {error}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Initialize a new workspace to track tutor training classes,
                attendance, and calculate payouts.
              </p>
            </div>
          </div>

          <div className="p-5 pt-0 mt-2 flex gap-3">
            <button
              onClick={() => setModalOpen(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting || !newYear}
              className="flex-1 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 dark:disabled:bg-blue-800/50 rounded-xl font-medium transition-all shadow-sm shadow-blue-600/20"
            >
              {isSubmitting ? "Creating..." : "Create Year"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

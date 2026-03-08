"use client";

import { Modal } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { HiPlus, HiXMark } from "react-icons/hi2";
import { addTrainingClass } from "../../actions";

export default function AddClassModal({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState("");
  const [trainingBy, setTrainingBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !trainingBy) return toast.error("Please fill all fields");

    setIsSubmitting(true);
    const toastId = toast.loading("Adding class...");

    try {
      const result = await addTrainingClass(
        year,
        month,
        new Date(date),
        trainingBy,
      );
      if (result.success) {
        toast.success("Class added successfully!", { id: toastId });
        setIsOpen(false);
        setDate("");
        setTrainingBy("");
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
      >
        <HiPlus className="w-4 h-4" />
        Add Class
      </button>

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
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Add Training Class
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
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
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
              disabled={isSubmitting}
              className="w-full py-3 mt-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Class"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

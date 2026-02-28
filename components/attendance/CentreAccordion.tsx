"use client";

import { useState } from "react";
import { HiChevronDown, HiChevronUp, HiOfficeBuilding } from "react-icons/hi";
import DataTable from "../CrudControls/Datatable";
import {
  getAttendanceColumns,
  processRows,
  renderActions,
} from "./AttendanceColumns";
import AttendanceModal from "./AttendanceModal";

interface CentreAccordionProps {
  centreName: string;
  centreId: string;
  classrooms: any[];
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
}

export default function CentreAccordion({
  centreName,
  centreId,
  classrooms,
  onSave,
  onDelete,
}: CentreAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // FIX: Removed the empty function argument
  const columns = getAttendanceColumns();

  const rows = processRows(classrooms);

  // Calculate how many classrooms have submitted attendance
  const submittedCount = classrooms.filter((c) => c.isSubmitted).length;
  const isComplete = submittedCount === classrooms.length;

  const openModal = (mode: "create" | "edit", row: any) => {
    setModalMode(mode);
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-4 shadow-sm bg-white overflow-hidden">
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          setIsOpen(!isOpen);
        }}
        className={`
          flex items-center justify-between p-4 cursor-pointer transition-colors
          ${isOpen ? "bg-gray-50 border-b border-gray-200" : "bg-white hover:bg-gray-50"}
        `}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${isComplete ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
          >
            <HiOfficeBuilding className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">
              {centreName}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Submitted:{" "}
              <span className={isComplete ? "text-green-600" : "text-blue-600"}>
                {submittedCount} / {classrooms.length}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-gray-400">
            {isOpen ? <HiChevronUp size={24} /> : <HiChevronDown size={24} />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-gray-50 animate-fadeIn">
          <DataTable
            columns={columns}
            rows={rows}
            actions={(row) =>
              renderActions(
                row,
                // The action passes back the mode ('create' for pending, 'edit' for existing)
                (selectedRow, mode) => openModal(mode, selectedRow),
                () => onDelete(row.id),
              )
            }
            page={1}
            pageSize={50}
          />
        </div>
      )}

      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialData={selectedRow}
        centreId={centreId}
        onSubmit={(data) => {
          onSave(data);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

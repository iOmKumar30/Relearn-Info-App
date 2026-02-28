import { Button } from "flowbite-react";
import { HiPencil, HiPhotograph, HiPlus, HiTrash } from "react-icons/hi";

// Helper to format percentage safely
const formatRatio = (present: number, total: number, days: number) => {
  if (!total || !days || total === 0 || days === 0) return "N/A";
  const possibleDays = total * days;
  const percentage = (present / possibleDays) * 100;
  return `${percentage.toFixed(2)}%`;
};

// Define the columns for your DataTable
export const getAttendanceColumns = () => [
  { key: "code", label: "Classroom Code" },
  { key: "tutorName", label: "Tutor Name" },
  { key: "section", label: "Section" },
  { key: "totalStudentsEnrolled", label: "Total Students" },
  { key: "openDays", label: "Days Open" },
  { key: "totalPresent", label: "Total Present" },
  { key: "ratio", label: "Attendance %" },
  { key: "registerPhotoUrl", label: "Register" },
  { key: "tutorPhone", label: "Tutor Phone" },
  { key: "remarks", label: "Remarks" },
];

// Helper to transform raw API data into Table Rows
export const processRows = (classrooms: any[]) => {
  return classrooms.map((c) => {
    if (!c.isSubmitted) {
      return {
        ...c,
        totalStudentsEnrolled: "-",
        openDays: "-",
        totalPresent: "-",
        ratio: "N/A",
        registerPhotoUrl: (
          <span className="text-gray-400 text-sm italic">Pending</span>
        ),
        remarks: "-",
      };
    }

    let processedRow = {
      ...c,
      ratio: formatRatio(c.totalPresent, c.totalStudentsEnrolled, c.openDays),
    };

    let isUrl = false;
    if (c.registerPhotoUrl && typeof c.registerPhotoUrl === "string") {
      const trimmedStr = c.registerPhotoUrl.trim();
      isUrl =
        trimmedStr.startsWith("http://") || trimmedStr.startsWith("https://");
    }

    processedRow.registerPhotoUrl = isUrl ? (
      <a
        href={c.registerPhotoUrl.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
      >
        <HiPhotograph className="w-4 h-4" />
        View
      </a>
    ) : c.registerPhotoUrl ? (
      <span
        className="text-gray-500 text-sm truncate max-w-[150px] inline-block"
        title={c.registerPhotoUrl}
      >
        Invalid Link
      </span>
    ) : (
      <span className="text-gray-400 text-sm italic">None</span>
    );

    processedRow.remarks = c.remarks ? (
      <div
        className="min-w-[250px] max-w-[400px] whitespace-normal wrap-break-word text-sm text-gray-600"
        title={c.remarks}
      >
        {c.remarks}
      </div>
    ) : (
      "-"
    );

    return processedRow;
  });
};

// Render row actions dynamically based on submission status
export const renderActions = (
  row: any,
  onEdit: (row: any, mode: "create" | "edit") => void,
  onDelete: (row: any) => void,
) => {
  // If no data exists yet, show a "Submit" button
  if (!row.isSubmitted) {
    return (
      <Button
        size="xs"
        color="blue"
        onClick={() => onEdit(row, "create")} // Triggers the modal in 'create' mode for this specific row
        className="focus:ring-2 focus:ring-blue-200"
      >
        <HiPlus className="mr-1.5 h-3.5 w-3.5" />
        Submit Data
      </Button>
    );
  }

  // If data exists, show standard Edit/Delete
  return (
    <div className="flex items-center gap-2">
      <Button
        size="xs"
        color="light"
        onClick={() => onEdit(row, "edit")}
        className="focus:ring-2 focus:ring-blue-200"
      >
        <HiPencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
      <Button
        size="xs"
        color="failure"
        onClick={() => onDelete(row)}
        className="focus:ring-2 focus:ring-red-200"
      >
        <HiTrash className="h-4 w-4" />
      </Button>
    </div>
  );
};

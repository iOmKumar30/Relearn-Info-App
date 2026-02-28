"use client";

import CentreAccordion from "@/components/attendance/CentreAccordion";
import ToggleSwitch from "@/components/attendance/ToggleSwitch";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import {
  FileInput,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
} from "flowbite-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  HiAcademicCap,
  HiCheckCircle,
  HiDocumentDownload,
  HiTrash,
  HiUpload,
  HiXCircle,
} from "react-icons/hi";
import * as XLSX from "xlsx";
import {
  bulkUploadAttendance,
  clearMonthAttendance,
  deleteAttendance,
  saveAttendance,
} from "../../actions";

interface ClientPageContentProps {
  year: number;
  month: number;
  initialData: any[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function ClientPageContent({
  year,
  month,
  initialData,
}: ClientPageContentProps) {
  const router = useRouter();
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [perfThreshold, setPerfThreshold] = useState<string>("all");
  const [perfOperator, setPerfOperator] = useState<">" | "<">(">");

  const monthName = MONTH_NAMES[month - 1];

  const exportColumns = [
    { key: "centreName", label: "Centre Name" },
    { key: "code", label: "Classroom Code" },
    { key: "tutorName", label: "Tutor Name" },
    { key: "section", label: "Section" },
    { key: "status", label: "Status" },
    { key: "totalStudentsEnrolled", label: "Total Students" },
    { key: "openDays", label: "Days Open" },
    { key: "totalPresent", label: "Total Present" },
    { key: "attendancePercentage", label: "Attendance %" },
    { key: "remarks", label: "Remarks" },
  ];

  const flattenDataForExport = (dataToFlatten: any[]) => {
    const flatRows: any[] = [];
    dataToFlatten.forEach((centre) => {
      centre.classrooms.forEach((cls: any) => {
        let percentage = "N/A";
        if (
          cls.isSubmitted &&
          cls.totalStudentsEnrolled > 0 &&
          cls.openDays > 0
        ) {
          percentage =
            (
              (cls.totalPresent / (cls.totalStudentsEnrolled * cls.openDays)) *
              100
            ).toFixed(2) + "%";
        }

        flatRows.push({
          centreName: centre.name,
          code: cls.code,
          tutorName: cls.tutorName,
          section: cls.section || "-",
          status: cls.isSubmitted ? "Submitted" : "Pending",
          totalStudentsEnrolled: cls.isSubmitted
            ? cls.totalStudentsEnrolled
            : "-",
          openDays: cls.isSubmitted ? cls.openDays : "-",
          totalPresent: cls.isSubmitted ? cls.totalPresent : "-",
          attendancePercentage: percentage,
          remarks: cls.remarks || "-",
        });
      });
    });
    return flatRows;
  };

  const filteredData = useMemo(() => {
    return initialData
      .map((centre) => {
        const filteredClassrooms = centre.classrooms.filter((cls: any) => {
          if (showMissingOnly && cls.isSubmitted) return false;

          if (perfThreshold !== "all" && cls.isSubmitted) {
            const threshold = parseFloat(perfThreshold);
            const possibleDays = cls.totalStudentsEnrolled * cls.openDays;

            if (possibleDays === 0) return false;

            const ratio = cls.totalPresent / possibleDays;

            if (perfOperator === ">" && ratio <= threshold) return false;
            if (perfOperator === "<" && ratio >= threshold) return false;
          }
          return true;
        });

        return { ...centre, classrooms: filteredClassrooms };
      })
      .filter((centre) => centre.classrooms.length > 0);
  }, [initialData, showMissingOnly, perfThreshold, perfOperator]);

  const visibleExportRows = useMemo(
    () => flattenDataForExport(filteredData),
    [filteredData],
  );

  const handleFetchAllForExport = async () => flattenDataForExport(initialData);

  const metrics = useMemo(() => {
    let total = 0;
    let submitted = 0;
    initialData.forEach((centre) => {
      total += centre.classrooms.length;
      submitted += centre.classrooms.filter((c: any) => c.isSubmitted).length;
    });
    return { total, submitted, missing: total - submitted };
  }, [initialData]);
  const handleClearMonth = async () => {
    if (metrics.submitted === 0) {
      toast.error("There is no data to clear for this month.");
      return;
    }

    const confirmClear = window.confirm(
      `WARNING: You are about to permanently delete all ${metrics.submitted} attendance records for ${monthName} ${year}.\n\nThis cannot be undone. Are you absolutely sure?`,
    );

    if (!confirmClear) return;

    const toastId = toast.loading("Clearing all records for this month...");
    setIsProcessing(true);

    try {
      const result = await clearMonthAttendance(year, month);

      if (result.success) {
        toast.success(result.message || "All records cleared successfully!", {
          id: toastId,
          duration: 4000,
        });
        router.refresh();
      } else {
        toast.error(`Failed to clear: ${result.error}`, { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred while clearing.", {
        id: toastId,
      });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };
  const handleDownloadTemplate = () => {
    const templateData: any[] = [];

    initialData.forEach((centre) => {
      centre.classrooms.forEach((cls: any) => {
        templateData.push({
          "Tutor's Name": `${cls.tutorName} (${cls.code})`,
          "Facilitators Name": "",
          "Centre Name": centre.name,
          Section: cls.section || "",
          "Attendance Month": `${month}/${year}`,
          "Total number of students (min: 5 to max:50)":
            cls.totalStudentsEnrolled || "",
          "How many days was the classroom open this month?(min: 15 to max: 31)":
            "",
          "Total number of students present (total p marked in the attendance sheet) in this month?  (min: 50 to max: 1000)":
            "",
          "Attach photo of the attendance register monthly data": "",
          "Phone Number": cls.tutorPhone || "",
          "Remark, if any": "",
        });
      });
    });

    if (templateData.length === 0) {
      toast.error("No active classrooms available to download.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance_Template");

    ws["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      { wch: 35 },
      { wch: 40 },
      { wch: 45 },
      { wch: 30 },
      { wch: 15 },
      { wch: 30 },
    ];
    XLSX.writeFile(wb, `Attendance_Template_${month}_${year}.xlsx`);
    toast.success("Template downloaded successfully!");
  };

  const handleSaveAttendance = async (data: any) => {
    const toastId = toast.loading("Saving attendance...");
    setIsProcessing(true);
    try {
      let rawPhotoUrl = "";
      if (
        typeof data.registerPhotoUrl === "object" &&
        data.registerPhotoUrl !== null
      ) {
        if (data.registerPhotoUrl.props && data.registerPhotoUrl.props.href) {
          rawPhotoUrl = data.registerPhotoUrl.props.href;
        } else if (
          data.registerPhotoUrl.props &&
          data.registerPhotoUrl.props.title
        ) {
          rawPhotoUrl = data.registerPhotoUrl.props.title;
        }
      } else {
        rawPhotoUrl = data.registerPhotoUrl || "";
      }

      const cleanData = {
        classroomId: data.classroomId,
        id: data.id,
        mode: data.mode,
        totalStudentsEnrolled: Number(data.totalStudentsEnrolled),
        openDays: Number(data.openDays),
        totalPresent: Number(data.totalPresent),
        registerPhotoUrl: rawPhotoUrl,
        remarks: typeof data.remarks === "string" ? data.remarks : "",
      };

      const result = await saveAttendance(cleanData, year, month);

      if (result.success) {
        toast.success("Attendance saved successfully!", { id: toastId });
        router.refresh();
      } else {
        toast.error(`Error: ${result.error}`, { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred", { id: toastId });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?"))
      return;

    const toastId = toast.loading("Deleting record...");
    setIsProcessing(true);
    try {
      const result = await deleteAttendance(id, year, month);
      if (result.success) {
        toast.success("Record deleted", { id: toastId });
        router.refresh();
      } else {
        toast.error(`Error: ${result.error}`, { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred", { id: toastId });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Parsing Excel file...");
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.error("Uploaded file is empty", { id: toastId });
          setIsProcessing(false);
          return;
        }

        const parsedRows: any[] = [];

        for (const [index, row] of rawData.entries()) {
          const rowNum = index + 2;

          const getValue = (keywords: string[]) => {
            const key = Object.keys(row as object).find((k) =>
              keywords.some((keyword) =>
                k.toLowerCase().includes(keyword.toLowerCase()),
              ),
            );
            return key ? (row as any)[key] : null;
          };

          const tutorStr = getValue([
            "Tutor's Name",
            "Tutor Name",
            "Tutors Name",
          ]);
          let classroomCode: string | null = null;

          if (tutorStr && typeof tutorStr === "string") {
            const match = tutorStr.match(/\(([^)]+)\)/);
            if (match && match[1]) classroomCode = match[1].trim();
          }

          const students = getValue([
            "Total number of students min",
            "Total number of students (min",
          ]);
          const daysOpen = getValue(["How many days was the classroom open"]);
          const present = getValue(["Total number of students present"]);
          const photo = getValue(["Attach photo"]);
          const remarks = getValue(["Remark"]);

          if (!classroomCode) {
            console.warn(
              `Skipping Row ${rowNum}: No Classroom Code found in '${tutorStr}'`,
            );
            continue;
          }

          parsedRows.push({
            code: classroomCode,
            totalStudentsEnrolled: parseInt(students) || 0,
            openDays: parseInt(daysOpen) || 0,
            totalPresent: parseInt(present) || 0,
            registerPhotoUrl: photo || "",
            remarks: remarks || "",
          });
        }

        if (parsedRows.length === 0) {
          toast.error("No valid classroom data found. Check column headers.", {
            id: toastId,
          });
          setIsProcessing(false);
          return;
        }

        toast.loading(`Uploading ${parsedRows.length} records...`, {
          id: toastId,
        });

        const result = await bulkUploadAttendance(parsedRows, year, month);

        if (result.success) {
          const skippedMsg =
            result.skipped > 0
              ? ` (${result.skipped} existing records skipped)`
              : "";
          toast.success(
            `Successfully added ${result.count} new records!${skippedMsg}`,
            {
              id: toastId,
              duration: 5000,
            },
          );
          setUploadModalOpen(false);
          router.refresh();
        } else {
          toast.error(`Upload failed: ${result.error}`, { id: toastId });
        }
      } catch (err) {
        console.error("Parse Error:", err);
        toast.error("Failed to parse Excel file.", { id: toastId });
      } finally {
        setIsProcessing(false);
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-[calc(100vh-100px)]">
      <div>
        <Link
          href={`/attendance/${year}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back to {year} Months
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {monthName} {year} Overview
          </h1>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            Review and manage all centre submissions for this month.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button
            onClick={handleClearMonth}
            disabled={isProcessing || metrics.submitted === 0}
            className="flex-1 lg:flex-none flex items-center justify-center px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-100 hover:text-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete all attendance data for this month"
          >
            <HiTrash className="mr-2 h-5 w-5" />
            Clear Data
          </button>
          <ExportXlsxButton
            fileName={`Attendance_${monthName}_${year}.xlsx`}
            sheetName="Attendance Data"
            columns={exportColumns as any}
            visibleRows={visibleExportRows}
            fetchAll={handleFetchAllForExport}
          />
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 lg:flex-none flex items-center justify-center px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm"
          >
            <HiDocumentDownload className="mr-2 h-5 w-5" />
            Smart Template
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center px-5 py-2.5 bg-blue-600 border border-transparent text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <HiUpload className="mr-2 h-5 w-5" />
            Upload File
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <HiAcademicCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Total Classrooms
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {metrics.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-2 -mt-2"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <HiCheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Submitted
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {metrics.submitted}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-16 h-16 ${metrics.missing > 0 ? "bg-red-50" : "bg-gray-50"} rounded-bl-full -mr-2 -mt-2`}
          ></div>
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={`p-3 rounded-xl ${metrics.missing > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}
            >
              <HiXCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Missing
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {metrics.missing}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-3 text-gray-700 font-medium text-sm">
            <ToggleSwitch
              checked={showMissingOnly}
              label="Show Missing Only"
              onChange={setShowMissingOnly}
            />
          </div>
        </div>

        <div className="hidden md:block w-px h-8 bg-gray-200"></div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <span className="whitespace-nowrap font-medium text-gray-700 text-sm">
            Performance Filter:
          </span>
          <div className="w-full flex gap-4">
            <div className="relative flex-1">
              <Select
                value={perfOperator}
                onChange={(e) => setPerfOperator(e.target.value as ">" | "<")}
                disabled={perfThreshold === "all"}
                className="w-full appearance-none bg-white/70 backdrop-blur-lg border border-white/40 text-gray-800 font-medium rounded-2xl px-4 py-3 shadow-lg shadow-blue-100/40 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
              >
                <option value=">">Greater than</option>
                <option value="<">Less than</option>
              </Select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                ▼
              </div>
            </div>

            <div className="relative flex-1">
              <Select
                value={perfThreshold}
                onChange={(e) => setPerfThreshold(e.target.value)}
                className="w-full appearance-none bg-linear-to-br from-white/80 to-blue-50/60 backdrop-blur-lg border border-blue-100 text-gray-800 font-medium rounded-2xl px-2 py-3 shadow-lg shadow-blue-100/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
              >
                <option value="all">Any Performance</option>
                <option value="0.1">0.1 (10%)</option>
                <option value="0.2">0.2 (20%)</option>
                <option value="0.3">0.3 (30%)</option>
                <option value="0.4">0.4 (40%)</option>
                <option value="0.5">0.5 (50%)</option>
                <option value="0.6">0.6 (60%)</option>
                <option value="0.7">0.7 (70%)</option>
                <option value="0.8">0.8 (80%)</option>
                <option value="0.9">0.9 (90%)</option>
                <option value="1.0">1.0 (100%)</option>
              </Select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
            <p className="text-lg text-gray-500 font-medium">
              No classrooms match your current filters.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting the toggles or thresholds above.
            </p>
          </div>
        ) : (
          filteredData.map((centre) => (
            <CentreAccordion
              key={centre.id}
              centreName={centre.name}
              centreId={centre.id}
              classrooms={centre.classrooms}
              onSave={handleSaveAttendance}
              onDelete={handleDeleteAttendance}
            />
          ))
        )}
      </div>

      <Modal
        show={isUploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        size="md"
      >
        <ModalHeader className="border-b border-gray-100">
          Upload Data
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-500">
              Upload the completed Smart Template (.xlsx). Make sure the
              "Tutor's Name (Code)" format remains unchanged.
            </p>
            <div className="w-full">
              <FileInput
                id="file-upload"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="w-full"
                color="info"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={() => setUploadModalOpen(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => setUploadModalOpen(false)}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Upload File"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import StudentCreateModal from "@/components/CreateModals/StudentCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import CentreSelect from "@/components/CrudControls/CentreSelect";
import ClassroomSelect from "@/components/CrudControls/ClassroomSelect";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import FilterDropdown from "@/components/CrudControls/FilterDropdown";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { FilterOption } from "@/types/filterOptions";
import { Badge, Button, Pagination } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";

type AssignmentRow = {
  id: string;
  classroomId: string;
  joinDate: string;
  leaveDate: string | null;
  status: "ACTIVE" | "LEFT";
  classroom: {
    id: string;
    code: string | null;
    centre: { code: string; name: string | null } | null;
  };
};

type StudentRow = {
  id: string;
  name: string;
  rollNo: string;
  gender: string | null;
  dob: string | null;
  category: string | null;
  schoolName: string | null;
  schoolType: string | null;
  standard: string | null; // <-- ADDED
  fatherName: string | null;
  motherName: string | null;
  parentPhone: string | null;
  streetAddress: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  aadhaarNo: string | null;
  admissionDate: string | null;
  createdAt: string;
  historicalTutorId: string | null; // <-- ADDED
  historicalTutor: { name: string | null } | null; // <-- ADDED
  activeAssignment: AssignmentRow | null;
};

const columns = [
  { key: "rollNo", label: "Roll No" },
  { key: "name", label: "Name" },
  { key: "gender", label: "Gender" },
  { key: "standard", label: "Standard" }, // <-- ADDED
  { key: "classroom", label: "Classroom" },
  { key: "school", label: "School" },
  { key: "category", label: "Category" },
  { key: "assignmentStatus", label: "Status" },
  { key: "parentPhone", label: "Parent Phone" },
];

const genderLabels: Record<string, string> = {
  M: "Male",
  F: "Female",
  O: "Others",
};

const categoryColors: Record<string, string> = {
  GENERAL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  EWS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  OBC: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  SC: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  ST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const schoolTypeLabels: Record<string, string> = {
  GOVERNMENT: "Govt",
  PRIVATE: "Private",
  GOVT_AIDED: "Govt Aided",
};

export default function StudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<StudentRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    total: number;
    rows: StudentRow[];
  } | null>(null);
  const debouncedSearch = useDebounce(search, 800);

  const filterOptions: FilterOption[] = [
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: ["M", "F", "O"],
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: ["GENERAL", "EWS", "OBC", "SC", "ST"],
    },
    {
      key: "assignmentStatus",
      label: "Assignment Status",
      type: "select",
      options: ["ACTIVE", "LEFT"],
    },
    {
      key: "schoolType",
      label: "School Type",
      type: "select",
      options: ["GOVERNMENT", "PRIVATE", "GOVT_AIDED"],
    },
    {
      key: "centreId",
      label: "Centre",
      type: "text",
      customRenderer: ({ value, onChange }) => (
        <CentreSelect
          value={value ? { id: value, label: value } : null}
          onChange={(v) => onChange(v?.id ?? "")}
          placeholder="Search centres..."
        />
      ),
    },
    {
      key: "classroomId",
      label: "Classroom",
      type: "text",
      customRenderer: ({ value, onChange }) => (
        <ClassroomSelect
          value={value ? { id: value, label: value } : null}
          onChange={(v) => onChange(v?.id ?? "")}
          placeholder="Search classrooms..."
        />
      ),
    },
  ];

  const buildUrl = useCallback(
    (pageParam = page, pageSizeParam = pageSize) => {
      const url = new URL("/api/admin/students", window.location.origin);
      url.searchParams.set("page", String(pageParam));
      url.searchParams.set("pageSize", String(pageSizeParam));
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      if (filters.gender) url.searchParams.set("gender", filters.gender);
      if (filters.category) url.searchParams.set("category", filters.category);
      if (filters.assignmentStatus)
        url.searchParams.set("assignmentStatus", filters.assignmentStatus);
      if (filters.schoolType)
        url.searchParams.set("schoolType", filters.schoolType);
      if (filters.centreId) url.searchParams.set("centreId", filters.centreId);
      if (filters.classroomId)
        url.searchParams.set("classroomId", filters.classroomId);
      return url.toString();
    },
    [page, pageSize, debouncedSearch, filters],
  );

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      setError(e?.message || "Failed to load students");
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const rawRows = useMemo(() => data?.rows ?? [], [data]);

  async function fetchAllStudents(): Promise<Record<string, any>[]> {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];
    const toastId = toast.loading("Preparing export...");
    try {
      while (true) {
        const url = new URL("/api/admin/students", window.location.origin);
        url.searchParams.set("page", String(pageAll));
        url.searchParams.set("pageSize", String(pageSizeAll));
        if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
        if (filters.gender) url.searchParams.set("gender", filters.gender);
        if (filters.category)
          url.searchParams.set("category", filters.category);
        if (filters.assignmentStatus)
          url.searchParams.set("assignmentStatus", filters.assignmentStatus);
        if (filters.schoolType)
          url.searchParams.set("schoolType", filters.schoolType);
        if (filters.centreId)
          url.searchParams.set("centreId", filters.centreId);
        if (filters.classroomId)
          url.searchParams.set("classroomId", filters.classroomId);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        const rows: StudentRow[] = json?.rows || [];
        out.push(
          ...rows.map((s) => ({
            rollNo: s.rollNo,
            name: s.name,
            gender: genderLabels[s.gender ?? ""] || "",
            dob: s.dob ? new Date(s.dob).toLocaleDateString("en-GB") : "",
            category: s.category || "",
            standard: s.standard || "", // <-- ADDED
            schoolName: s.schoolName || "",
            schoolType: s.schoolType
              ? schoolTypeLabels[s.schoolType] || s.schoolType
              : "",
            fatherName: s.fatherName || "",
            motherName: s.motherName || "",
            parentPhone: s.parentPhone || "",
            city: s.city || "",
            district: s.district || "",
            state: s.state || "",
            pincode: s.pincode || "",
            aadhaarNo: s.aadhaarNo || "",
            admissionDate: s.admissionDate
              ? new Date(s.admissionDate).toLocaleDateString("en-GB")
              : "",
            classroom: s.activeAssignment?.classroom?.code || "",
            centre: s.activeAssignment?.classroom?.centre
              ? `${s.activeAssignment.classroom.centre.code} — ${s.activeAssignment.classroom.centre.name ?? ""}`
              : "",
            historicalTutor: s.historicalTutor?.name || "", // <-- ADDED
            assignmentStatus: s.activeAssignment?.status || "N/A",
            joinDate: s.activeAssignment?.joinDate
              ? new Date(s.activeAssignment.joinDate).toLocaleDateString(
                  "en-GB",
                )
              : "",
          })),
        );
        if (rows.length < pageSizeAll) break;
        pageAll += 1;
        if (pageAll > 200) break;
      }
      toast.success("Export ready", { id: toastId });
      return out;
    } catch (e) {
      toast.error("Export failed", { id: toastId });
      throw e;
    }
  }

  const formattedVisibleForExport = useMemo(() => {
    return rawRows.map((s) => ({
      rollNo: s.rollNo,
      name: s.name,
      gender: genderLabels[s.gender ?? ""] || "",
      category: s.category || "",
      standard: s.standard || "", // <-- ADDED
      schoolName: s.schoolName || "",
      classroom: s.activeAssignment?.classroom?.code || "",
      historicalTutor: s.historicalTutor?.name || "", // <-- ADDED
      assignmentStatus: s.activeAssignment?.status || "N/A",
      parentPhone: s.parentPhone || "",
    }));
  }, [rawRows]);

  const getGenderBadge = (gender: string | null) => {
    if (!gender) return <span className="text-gray-400">—</span>;
    const base =
      "flex items-center justify-center px-2 py-0.5 min-w-[1.5rem] text-xs font-semibold uppercase text-white rounded-full";
    switch (gender) {
      case "M":
        return <span className={`${base} bg-blue-500`}>M</span>;
      case "F":
        return <span className={`${base} bg-pink-500`}>F</span>;
      case "O":
        return <span className={`${base} bg-purple-500`}>O</span>;
      default:
        return <span className="text-gray-400">—</span>;
    }
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return <span className="text-gray-400">—</span>;
    const cls = categoryColors[category] ?? "bg-gray-100 text-gray-700";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}
      >
        {category}
      </span>
    );
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-400">—</span>;
    return (
      <Badge color={status === "ACTIVE" ? "success" : "gray"} className="w-fit">
        {status}
      </Badge>
    );
  };

  const rows = useMemo(() => {
    return (data?.rows ?? []).map((s) => ({
      ...s,
      gender: getGenderBadge(s.gender),
      category: getCategoryBadge(s.category),
      standard: s.standard || <span className="text-gray-400">—</span>, // <-- ADDED
      classroom: s.activeAssignment?.classroom ? (
        <span className="font-mono text-xs flex flex-col">
          <span>
            {s.activeAssignment.classroom.code ?? "—"}
            {s.activeAssignment.classroom.centre && (
              <span className="ml-1 text-gray-500 font-normal">
                ({s.activeAssignment.classroom.centre.code})
              </span>
            )}
          </span>
          {s.historicalTutor?.name && (
            <span className="text-[10px] text-gray-500 font-sans mt-0.5">
              Tutor: {s.historicalTutor.name}
            </span>
          )}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
      school: s.schoolName ? (
        <span className="flex flex-col">
          <span className="text-sm">{s.schoolName}</span>
          {s.schoolType && (
            <span className="text-xs text-gray-500">
              {schoolTypeLabels[s.schoolType] ?? s.schoolType}
            </span>
          )}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
      assignmentStatus: getStatusBadge(s.activeAssignment?.status ?? null),
      parentPhone: s.parentPhone ?? <span className="text-gray-400">—</span>,
    }));
  }, [data]);

  const handleCreate = async (payload: any) => {
    const toastId = toast.loading("Creating student...");
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setCreateOpen(false);
      toast.success("Student created successfully", { id: toastId });
    } catch (e: any) {
      const msg = e?.message || "Failed to create student";
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (studentId: string, payload: any) => {
    const toastId = toast.loading("Updating student...");
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setEditOpen(false);
      setEditRow(null);
      toast.success("Student updated successfully", { id: toastId });
    } catch (e: any) {
      const msg = e?.message || "Failed to update student";
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow?.id) return;
    const toastId = toast.loading("Deleting student...");
    try {
      setDeleting(true);
      setError(null);
      const res = await fetch(`/api/admin/students/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setDeleteOpen(false);
      setDeleteRow(null);
      toast.success("Student deleted successfully", { id: toastId });
    } catch (e: any) {
      const msg = e?.message || "Failed to delete student";
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const renderActions = (row: any) => (
    <div className="flex gap-2">
      <Button
        size="xs"
        color="light"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          const raw = rawRows.find((x) => x.id === row.id);
          if (!raw) return;
          setEditRow(raw);
          setEditOpen(true);
        }}
      >
        Edit
      </Button>
      <Button
        size="xs"
        color="failure"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          const raw = rawRows.find((x) => x.id === row.id);
          if (!raw) return;
          setDeleteRow(raw);
          setDeleteOpen(true);
        }}
      >
        Delete
      </Button>
    </div>
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Students</h1>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search students by name, roll no, or phone..."
          />
          <FilterDropdown
            filters={filterOptions}
            onFilterChange={(newFilters) => {
              setFilters(newFilters);
              setPage(1);
            }}
          />
          <div className="flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:justify-end">
            <ExportXlsxButton
              visibleRows={formattedVisibleForExport}
              fetchAll={fetchAllStudents}
              fileName="students"
            />
            <AddButton
              label="Add Student"
              onClick={() => setCreateOpen(true)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm dark:bg-red-900/20 dark:border-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-16">
            <ClipLoader size={36} color="#6B7280" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            actions={renderActions}
            page={page}
            pageSize={pageSize}
            onRowClick={(row) => router.push(`/students/${row.id}`)}
          />
        )}

        {/* Pager */}
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            onPageChange={(p) => setPage(p)}
            totalPages={totalPages}
            showIcons
          />
        </div>

        {/* Create modal */}
        <StudentCreateModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />

        {/* Edit modal */}
        <StudentCreateModal
          open={editOpen}
          mode="edit"
          initialValues={editRow ?? undefined}
          onClose={() => {
            setEditOpen(false);
            setEditRow(null);
          }}
          onUpdate={handleUpdate}
        />

        {/* Delete confirm modal */}
        <ConfirmDeleteModal
          open={deleteOpen}
          title="Delete Student"
          message={`Are you sure you want to delete this student?`}
          onCancel={() => {
            setDeleteOpen(false);
            setDeleteRow(null);
          }}
          onConfirm={handleDelete}
          processing={deleting}
        />
      </div>
    </RBACGate>
  );
}

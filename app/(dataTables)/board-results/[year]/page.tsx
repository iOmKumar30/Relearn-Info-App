"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import BoardExamResultModal from "@/components/CreateModals/BoardExamResultModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Button, Pagination } from "flowbite-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";

type Row = {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  schoolName: string | null;
  city: string | null;
  state: string | null;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  grade: string;
  classroomCode: string | null;
  tutorName: string | null;
  createdAt: string;
  updatedAt: string;
};

type Analytics = {
  totalResults: number;
  averagePercentage: number;
  highestPercentage: number;
  averageMarksObtained: number;
};

const columns = [
  { key: "student", label: "Student" },
  { key: "school", label: "School" },
  { key: "classroom", label: "Classroom" },
  { key: "tutor", label: "Tutor" },
  { key: "totalMarks", label: "Total Marks" },
  { key: "marksObtained", label: "Marks Obtained" },
  { key: "percentage", label: "Percentage" },
  { key: "grade", label: "Grade" },
];

const pct = (n: number) => `${n.toFixed(2)}%`;

export default function BoardResultsYearPage(ctx: {
  params: Promise<{ year: string }>;
}) {
  const router = useRouter();
  const { year } = use(ctx.params);
  const pageSize = 20;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 700);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const buildUrl = useCallback(() => {
    const url = new URL(
      `/api/admin/board-results/years/${year}`,
      window.location.origin,
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    return url.toString();
  }, [year, page, pageSize, debouncedSearch]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows || [] });
      setAnalytics(json.analytics || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load board results");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const buildListUrl = useCallback(
    (pageParam: number, pageSizeParam: number) => {
      const url = new URL(
        `/api/admin/board-results/years/${year}`,
        window.location.origin,
      );
      url.searchParams.set("page", String(pageParam));
      url.searchParams.set("pageSize", String(pageSizeParam));
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      return url;
    },
    [year, debouncedSearch],
  );

  async function fetchAllResults(): Promise<Record<string, any>[]> {
    const out: Record<string, any>[] = [];
    const pageSizeAll = 1000;
    let pageAll = 1;
    const t = toast.loading("Preparing export...");

    try {
      while (true) {
        const res = await fetch(buildListUrl(pageAll, pageSizeAll).toString(), {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        const rows: Row[] = json.rows || [];

        out.push(
          ...rows.map((r) => ({
            studentName: r.studentName,
            rollNo: r.rollNo,
            schoolName: r.schoolName || "",
            city: r.city || "",
            state: r.state || "",
            classroomCode: r.classroomCode || "N/A",
            tutorName: r.tutorName || "N/A",
            totalMarks: r.totalMarks,
            marksObtained: r.marksObtained,
            percentage: r.percentage.toFixed(2),
            grade: r.grade,
            createdAt: new Date(r.createdAt).toLocaleDateString("en-GB"),
          })),
        );

        if (rows.length < pageSizeAll) break;
        pageAll += 1;
        if (pageAll > 200) break;
      }

      toast.success("Export ready", { id: t });
      return out;
    } catch (e) {
      toast.error("Export failed", { id: t });
      throw e;
    }
  }

  const visibleExportRows = useMemo(
    () =>
      (data?.rows || []).map((r) => ({
        studentName: r.studentName,
        rollNo: r.rollNo,
        schoolName: r.schoolName || "",
        city: r.city || "",
        state: r.state || "",
        classroomCode: r.classroomCode || "N/A",
        tutorName: r.tutorName || "N/A",
        totalMarks: r.totalMarks,
        marksObtained: r.marksObtained,
        percentage: r.percentage.toFixed(2),
        grade: r.grade,
        createdAt: new Date(r.createdAt).toLocaleDateString("en-GB"),
      })),
    [data],
  );

  const tableRows = useMemo(
    () =>
      (data?.rows || []).map((r) => ({
        ...r,
        student: (
          <div className="min-w-[180px]">
            <div className="font-medium">{r.studentName}</div>
            <div className="text-xs text-gray-500">Roll No: {r.rollNo}</div>
          </div>
        ),
        school: (
          <div className="min-w-[180px]">
            <div>{r.schoolName || "—"}</div>
            <div className="text-xs text-gray-500">
              {[r.city, r.state].filter(Boolean).join(", ") || "—"}
            </div>
          </div>
        ),
        classroom: (
          <div className="min-w-[120px]">
            <div className="font-medium text-gray-900">
              {r.classroomCode || "Unknown Class"}
            </div>
          </div>
        ),
        tutor: (
          <div className="min-w-[120px]">
            <div className="font-medium text-gray-900">
              {r.tutorName || "Unknown Tutor"}
            </div>
          </div>
        ),
        percentage: (
          <Badge color="info" className="w-fit">
            {pct(r.percentage)}
          </Badge>
        ),
        grade: <span className="font-medium">{r.grade}</span>,
      })),
    [data],
  );

  const handleCreate = async (payload: {
    studentId: string;
    totalMarks: number;
    marksObtained: number;
    grade: string;
  }) => {
    const t = toast.loading("Creating result...");
    try {
      const res = await fetch(`/api/admin/board-results/years/${year}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Result created", { id: t });
      setCreateOpen(false);
      await fetchRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create result", { id: t });
    }
  };

  const handleUpdate = async (
    resultId: string,
    payload: {
      studentId: string;
      totalMarks: number;
      marksObtained: number;
      grade: string;
    },
  ) => {
    const t = toast.loading("Updating result...");
    try {
      const res = await fetch(`/api/admin/board-results/results/${resultId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Result updated", { id: t });
      setEditOpen(false);
      setEditRow(null);
      await fetchRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update result", { id: t });
    }
  };

  const handleDelete = async () => {
    if (!deleteRow?.id) return;

    const t = toast.loading("Deleting result...");
    try {
      setDeleting(true);
      const res = await fetch(
        `/api/admin/board-results/results/${deleteRow.id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error(await res.text());

      toast.success("Result deleted", { id: t });
      setDeleteOpen(false);
      setDeleteRow(null);
      await fetchRows();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete result", { id: t });
    } finally {
      setDeleting(false);
    }
  };

  const renderActions = (row: any) => (
    <div className="flex gap-2">
      <Button
        size="xs"
        color="blue"
        onClick={(e) => {
          e.stopPropagation();
          const raw = data?.rows.find((x) => x.id === row.id);
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
        onClick={(e) => {
          e.stopPropagation();
          const raw = data?.rows.find((x) => x.id === row.id);
          if (!raw) return;
          setDeleteRow(raw);
          setDeleteOpen(true);
        }}
      >
        Delete
      </Button>
    </div>
  );

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={() => router.push("/board-results")}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              title="Back"
            >
              <svg
                className="w-5 h-5 text-gray-700"
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
              <h1 className="text-2xl font-semibold">Board Results {year}</h1>
              <p className="text-sm text-gray-600">
                Manage student board exam records for passing year {year}.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ExportXlsxButton
              fileName={`board-results-${year}`}
              sheetName={`Board Results ${year}`}
              columns={[
                { key: "studentName", label: "Student Name" },
                { key: "rollNo", label: "Roll No" },
                { key: "schoolName", label: "School" },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "classroomCode", label: "Classroom Code" },
                { key: "tutorName", label: "Tutor Name" },
                { key: "totalMarks", label: "Total Marks" },
                { key: "marksObtained", label: "Marks Obtained" },
                { key: "percentage", label: "Percentage" },
                { key: "grade", label: "Grade" },
                { key: "createdAt", label: "Created At" },
              ]}
              visibleRows={visibleExportRows}
              fetchAll={fetchAllResults}
            />
            <AddButton label="Add Result" onClick={() => setCreateOpen(true)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Total Results</div>
            <div className="mt-2 text-2xl font-bold">
              {analytics?.totalResults ?? 0}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Average Percentage</div>
            <div className="mt-2 text-2xl font-bold">
              {analytics ? pct(analytics.averagePercentage) : "0.00%"}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Highest Percentage</div>
            <div className="mt-2 text-2xl font-bold">
              {analytics ? pct(analytics.highestPercentage) : "0.00%"}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Average Marks Obtained</div>
            <div className="mt-2 text-2xl font-bold">
              {analytics?.averageMarksObtained?.toFixed(2) ?? "0.00"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by student name, roll no, or school..."
          />
        </div>

        {loading && !data ? (
          <div className="flex min-h-80 items-center justify-center">
            <ClipLoader size={36} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={tableRows}
            actions={renderActions}
            page={page}
            pageSize={pageSize}
          />
        )}

        <div className="flex overflow-x-auto pb-1 sm:justify-end">
          <Pagination
            currentPage={page}
            onPageChange={(p) => setPage(p)}
            totalPages={totalPages}
            showIcons
          />
        </div>
      </div>

      <BoardExamResultModal
        open={createOpen}
        mode="create"
        fixedYear={Number(year)}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <BoardExamResultModal
        open={editOpen}
        mode="edit"
        fixedYear={Number(year)}
        initialValues={
          editRow
            ? {
                id: editRow.id,
                student: {
                  id: editRow.studentId,
                  label: `${editRow.studentName} — ${editRow.rollNo}`,
                },
                totalMarks: String(editRow.totalMarks),
                marksObtained: String(editRow.marksObtained),
                grade: editRow.grade,
              }
            : undefined
        }
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
        onUpdate={handleUpdate}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Result"
        message={`Delete board result for ${deleteRow?.studentName ?? ""}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteRow(null);
        }}
        onConfirm={handleDelete}
        processing={deleting}
      />
    </RBACGate>
  );
}

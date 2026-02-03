"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import ClassroomCreateModal from "@/components/CreateModals/ClassroomCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import CentreSelectAll from "@/components/CrudControls/CentreSelectAll";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton"; // NEW
import FilterDropdown from "@/components/CrudControls/FilterDropdown";
import SearchBar from "@/components/CrudControls/SearchBar";
import StateSelect from "@/components/CrudControls/StateSelect";
import RBACGate from "@/components/RBACGate";
import type { FilterOption } from "@/types/filterOptions";
import { Badge, Button } from "flowbite-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

type ClassroomRow = {
  id: string;
  code: string;
  centreId: string;
  centre: { id: string; code: string; name: string; state: string };
  section: "JR" | "SR" | "BOTH";
  streetAddress: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  timing: "MORNING" | "EVENING";
  monthlyAllowance: number;
  status: "ACTIVE" | "INACTIVE";
  dateCreated: string;
  dateClosed: string | null;
  createdAt: string;
  updatedAt: string;
  tutorAssignments?: Array<{
    id: string;
    isSubstitute: boolean;
    user: { id: string; name: string | null; email: string };
  }>;
};

// DataTable columns
const columns = [
  { key: "code", label: "Classroom Code" },
  { key: "centre_name", label: "Centre Name" },
  { key: "centre_code", label: "Centre Code" },
  { key: "section", label: "Section" },
  { key: "streetAddress", label: "Street Address" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "currentTutor", label: "Current Tutor" },
  { key: "timing", label: "Timing" },
  { key: "monthlyAllowance", label: "Monthly Allowance" },
  { key: "status", label: "Status" },
  { key: "dateCreated", label: "Date Created" },
  { key: "dateClosed", label: "Date Closed" },
];

// Filter config for UI
const classroomFilters: FilterOption[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["ACTIVE", "INACTIVE"],
  },
  { key: "section", label: "Section", type: "select", options: ["JR", "SR"] },
  {
    key: "timing",
    label: "Timing",
    type: "select",
    options: ["MORNING", "EVENING"],
  },
  {
    key: "centreCode",
    label: "Centre Code",
    type: "text",
    customRenderer: ({ value, onChange }) => (
      <CentreSelectAll
        value={value || null}
        onChange={(code) => onChange(code || "")}
        placeholder="Select centre"
      />
    ),
  },
  {
    key: "state",
    label: "State",
    type: "text",
    customRenderer: ({ value, onChange }) => (
      <StateSelect
        value={value || null}
        onChange={(fullName) => onChange(fullName || "")}
      />
    ),
  },
];

export default function ClassroomsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  // Initialize filters from URL
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (searchParams.get("centreCode"))
      f.centreCode = searchParams.get("centreCode")!;
    if (searchParams.get("section")) f.section = searchParams.get("section")!;
    if (searchParams.get("timing")) f.timing = searchParams.get("timing")!;
    if (searchParams.get("status")) f.status = searchParams.get("status")!;
    if (searchParams.get("state")) f.state = searchParams.get("state")!;
    return f;
  });
  const pageSize = 20;

  // Create/Edit/Delete state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ClassroomRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ClassroomRow | null>(null);

  // Data state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    total: number;
    rows: ClassroomRow[];
  } | null>(null);
  const debouncedSearch = useDebounce(search, 800);

  // Build list URL with pagination, search, and facet filters
  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/classrooms", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    if (filters.centreCode)
      url.searchParams.set("centreCode", filters.centreCode);
    if (filters.section) url.searchParams.set("section", filters.section);
    if (filters.timing) url.searchParams.set("timing", filters.timing);
    if (filters.status) url.searchParams.set("status", filters.status);
    if (filters.state) url.searchParams.set("state", filters.state);
    return url.toString();
  }, [page, pageSize, debouncedSearch, filters]);

  // Fetch rows
  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      setError(e?.message || "Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Raw rows for export (avoid JSX)
  const rawRows = useMemo(() => data?.rows ?? [], [data]);

  // Helper to build same URL with custom page/pageSize (for export all)
  const buildListUrl = useCallback(
    (pageParam: number, pageSizeParam: number) => {
      const url = new URL("/api/admin/classrooms", window.location.origin);
      url.searchParams.set("page", String(pageParam));
      url.searchParams.set("pageSize", String(pageSizeParam));
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      if (filters.centreCode)
        url.searchParams.set("centreCode", filters.centreCode);
      if (filters.section) url.searchParams.set("section", filters.section);
      if (filters.timing) url.searchParams.set("timing", filters.timing);
      if (filters.status) url.searchParams.set("status", filters.status);
      if (filters.state) url.searchParams.set("state", filters.state);
      return url;
    },
    [debouncedSearch, filters],
  );

  // Fetch all classrooms across pages with current filters/search
  async function fetchAllClassrooms(): Promise<Record<string, any>[]> {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];

    while (true) {
      const url = buildListUrl(pageAll, pageSizeAll);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const rows: ClassroomRow[] = json?.rows || [];

      out.push(
        ...rows.map((r) => ({
          code: r.code,
          centreName: r.centre?.name || "",
          centreCode: r.centre?.code || "",
          section: r.section,
          streetAddress: r.streetAddress,
          district: r.district,
          state: r.state,
          currentTutor:
            r.tutorAssignments && r.tutorAssignments.length > 0
              ? `${r.tutorAssignments[0].user.name || "Unnamed"} (${
                  r.tutorAssignments[0].user.email
                })${r.tutorAssignments[0].isSubstitute ? " [SUB]" : ""}`
              : "",
          timing: r.timing,
          monthlyAllowance: r.monthlyAllowance,
          status: r.status,
          dateCreated: r.dateCreated
            ? new Date(r.dateCreated).toLocaleDateString("en-GB")
            : "",
          dateClosed: r.dateClosed
            ? new Date(r.dateClosed).toLocaleDateString("en-GB")
            : "",
        })),
      );

      if (rows.length < pageSizeAll) break;
      pageAll += 1;
      if (pageAll > 200) break; // safety
    }

    return out;
  }

  // Visible rows formatted for export (no JSX)
  const formattedVisibleForExport = useMemo(() => {
    return rawRows.map((r) => ({
      code: r.code,
      centreName: r.centre?.name || "",
      centreCode: r.centre?.code || "",
      section: r.section,
      streetAddress: r.streetAddress,
      district: r.district,
      state: r.state,
      currentTutor:
        r.tutorAssignments && r.tutorAssignments.length > 0
          ? `${r.tutorAssignments[0].user.name || "Unnamed"} (${
              r.tutorAssignments[0].user.email
            })${r.tutorAssignments[0].isSubstitute ? " [SUB]" : ""}`
          : "",
      timing: r.timing,
      monthlyAllowance: r.monthlyAllowance,
      status: r.status,
      dateCreated: r.dateCreated
        ? new Date(r.dateCreated).toLocaleDateString("en-GB")
        : "",
      dateClosed: r.dateClosed
        ? new Date(r.dateClosed).toLocaleDateString("en-GB")
        : "",
    }));
  }, [rawRows]);

  // Map rows for DataTable render (with JSX)
  const rows = useMemo(() => {
    return (data?.rows ?? []).map((r) => ({
      ...r,
      centre_name: r.centre?.name || "",
      centre_code: r.centre?.code || "",
      section:
        r.section === "JR" ? (
          <Badge color="pink" className="uppercase">
            JR
          </Badge>
        ) : r.section === "SR" ? (
          <Badge color="purple" className="uppercase">
            SR
          </Badge>
        ) : (
          <Badge color="indigo" className="uppercase">
            JR/SR
          </Badge>
        ),
      timing:
        r.timing === "MORNING" ? (
          <Badge color="success" className="uppercase">
            MORNING
          </Badge>
        ) : (
          <Badge color="warning" className="uppercase">
            EVENING
          </Badge>
        ),
      status: (
        <Badge
          color={r.status === "ACTIVE" ? "success" : "gray"}
          className="uppercase"
        >
          {r.status}
        </Badge>
      ),
      currentTutor:
        r.tutorAssignments && r.tutorAssignments.length > 0 ? (
          <span>
            {r.tutorAssignments[0].user.name || "Unnamed"} (
            {r.tutorAssignments[0].user.email})
            {r.tutorAssignments[0].isSubstitute && (
              <Badge color="warning" size="xs" className="ml-1">
                SUB
              </Badge>
            )}
          </span>
        ) : (
          "—"
        ),
      dateCreated: r.dateCreated
        ? new Date(r.dateCreated).toLocaleDateString("en-GB")
        : "",
      dateClosed: r.dateClosed
        ? new Date(r.dateClosed).toLocaleDateString("en-GB")
        : "",
      monthlyAllowance: `₹ ${r.monthlyAllowance.toLocaleString("en-IN")}`,
    }));
  }, [data]);

  // Create → POST
  const handleCreate = async (payload: any) => {
    try {
      setLoading(true);
      setError(null);

      let centreId = payload.centre_id?.trim();
      const centreName = payload.centre_name?.trim();

      if (!centreId) {
        const centreRes = await fetch(
          `/api/admin/centres?page=1&pageSize=1&q=${encodeURIComponent(
            centreName,
          )}`,
          { cache: "no-store" },
        );
        if (!centreRes.ok) throw new Error(await centreRes.text());
        const centreJson = await centreRes.json();
        const centre = centreJson.rows?.[0];
        if (!centre)
          throw new Error("Centre not found. Please select a valid centre.");
        centreId = centre.id;
      }

      const body = {
        centreId,
        section: payload.section_code.toUpperCase().startsWith("J")
          ? "JR"
          : payload.section_code.toUpperCase().startsWith("S")
            ? "SR"
            : "BOTH",
        timing: payload.timing.toUpperCase().startsWith("M")
          ? "MORNING"
          : "EVENING",
        monthlyAllowance: Number(payload.monthly_allowance) || 0,
        status: payload.status === "Active" ? "ACTIVE" : "INACTIVE",
        streetAddress: payload.street_address.trim(),
        city: payload.city.trim(),
        district: payload.district.trim(),
        state: payload.state.trim(),
        pincode: payload.pincode.trim(),
        dateCreated: payload.date_created,
        dateClosed: payload.date_closed || null,
      };

      const res = await fetch("/api/admin/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchRows();
      setCreateOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create classroom");
    } finally {
      setLoading(false);
    }
  };

  // Update → PUT
  const handleUpdate = async (classroom_id: string, payload: any) => {
    try {
      setLoading(true);
      setError(null);

      let centreId = payload.centre_id?.trim();
      const centreName = payload.centre_name?.trim();

      if (!centreId) {
        const centreRes = await fetch(
          `/api/admin/centres?page=1&pageSize=1&q=${encodeURIComponent(
            centreName,
          )}`,
          { cache: "no-store" },
        );
        if (!centreRes.ok) throw new Error(await centreRes.text());
        const centreJson = await centreRes.json();
        const centre = centreJson.rows?.[0];
        if (!centre) throw new Error("Centre not found for update.");
        centreId = centre.id;
      }

      const body: any = {
        centreId,
        section: payload.section_code.toUpperCase().startsWith("J")
          ? "JR"
          : payload.section_code.toUpperCase().startsWith("S")
            ? "SR"
            : "BOTH",
        timing: payload.timing.toUpperCase().startsWith("M")
          ? "MORNING"
          : "EVENING",
        monthlyAllowance: Number(payload.monthly_allowance) || 0,
        status: payload.status === "Active" ? "ACTIVE" : "INACTIVE",
        streetAddress: payload.street_address.trim(),
        city: payload.city.trim(),
        district: payload.district.trim(),
        state: payload.state.trim(),
        pincode: payload.pincode.trim(),
        dateCreated: payload.date_created,
        dateClosed: payload.date_closed || null,
      };

      const res = await fetch(`/api/admin/classrooms/${classroom_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchRows();
      setEditOpen(false);
      setEditRow(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update classroom");
    } finally {
      setLoading(false);
    }
  };

  // Delete → DELETE
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!deleteRow?.id) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetch(`/api/admin/classrooms/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setDeleteOpen(false);
      setDeleteRow(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete classroom");
    } finally {
      setDeleting(false);
    }
  };

  // Actions column
  const renderActions = (row: any) => (
    <div className="flex gap-2">
      <Button
        size="xs"
        color="blue"
        onClick={() => {
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
        onClick={() => {
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

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  // Sync URL with State
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (page > 1) params.set("page", String(page)); // Only set if not default

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    // Update URL without refreshing (replace history to avoid cluttering back button)
    // or push if you want every filter change to be a history step.
    // "replace" is usually better for typing search, "push" for filters.
    // For simplicity, let's use replace here so "Back" goes to previous page, not previous filter state.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, filters, page, pathname, router]);

  return (
    <RBACGate roles={["ADMIN"]}>
      <h2 className="text-2xl font-semibold mb-4">Classrooms</h2>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search classrooms..."
        />
        <div className="flex-1 flex justify-end gap-4 z-100">
          <ExportXlsxButton
            fileName="classrooms"
            sheetName="Classrooms"
            columns={[
              { key: "code", label: "Classroom Code" },
              { key: "centreName", label: "Centre Name" },
              { key: "centreCode", label: "Centre Code" },
              { key: "section", label: "Section" },
              { key: "streetAddress", label: "Street Address" },
              { key: "district", label: "District" },
              { key: "state", label: "State" },
              { key: "currentTutor", label: "Current Tutor" },
              { key: "timing", label: "Timing" },
              { key: "monthlyAllowance", label: "Monthly Allowance" },
              { key: "status", label: "Status" },
              { key: "dateCreated", label: "Date Created" },
              { key: "dateClosed", label: "Date Closed" },
            ]}
            visibleRows={formattedVisibleForExport}
            fetchAll={fetchAllClassrooms}
          />
          <AddButton
            label="Add Classroom"
            onClick={() => setCreateOpen(true)}
          />
          <FilterDropdown
            filters={[...classroomFilters]}
            onFilterChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center items-center h-screen">
          <ClipLoader size={40} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          actions={renderActions}
          onRowClick={(row: any) =>
            router.push(`/classrooms/${encodeURIComponent(row.id)}`)
          }
          page={page}
          pageSize={pageSize}
        />
      )}

      {/* Pager */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          size="xs"
          color="light"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>
        <span className="text-sm text-gray-600">
          Page {page} / {totalPages}
        </span>
        <Button
          size="xs"
          color="light"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {/* Create modal */}
      <ClassroomCreateModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Edit modal */}
      <ClassroomCreateModal
        open={editOpen}
        mode="edit"
        initialValues={
          editRow
            ? {
                classroom_id: editRow.id,
                centre_id: editRow.centreId,
                centre_name: editRow.centre?.name || "",
                section_code: editRow.section === "JR" ? "Junior" : "Senior",
                street_address: editRow.streetAddress,
                city: editRow.city,
                district: editRow.district,
                state: editRow.state,
                pincode: editRow.pincode,
                monthly_allowance: editRow.monthlyAllowance,
                timing: editRow.timing === "MORNING" ? "Morning" : "Evening",
                status: editRow.status === "ACTIVE" ? "Active" : "Inactive",
                date_created: editRow.dateCreated
                  ? new Date(editRow.dateCreated).toISOString().slice(0, 10)
                  : "",
                date_closed: editRow.dateClosed
                  ? new Date(editRow.dateClosed).toISOString().slice(0, 10)
                  : "",
              }
            : undefined
        }
        onUpdate={(id, payload) => handleUpdate(id, payload as any)}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
      />

      {/* Delete confirm modal */}
      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Classroom"
        message={`Are you sure you want to delete classroom ${
          deleteRow?.code || ""
        }? This cannot be undone.`}
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

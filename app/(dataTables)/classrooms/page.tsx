"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import ClassroomCreateModal from "@/components/CreateModals/ClassroomCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import FilterDropdown from "@/components/CrudControls/FilterDropdown";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import type { FilterOption } from "@/types/filterOptions";
import { Badge, Button } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";
type ClassroomRow = {
  id: string;
  code: string; // e.g., "J01-JR-01"
  centreId: string;
  centre: { id: string; code: string; name: string; state: string };
  section: "JR" | "SR";
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
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
};
// DataTable columns
const columns = [
  { key: "code", label: "Classroom Code" },
  { key: "centre_name", label: "Centre Name" },
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
  { key: "centreId", label: "Centre ID", type: "text" }, // optional direct centre filter
];

export default function ClassroomsPage() {
  // UI state
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const router = useRouter();

  // Create/Edit/Delete modal state
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
  // Build list URL with pagination, free-text q, and facet filters (centreId, section, timing, status)
  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/classrooms", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    if (filters.centreId) url.searchParams.set("centreId", filters.centreId);
    if (filters.section) url.searchParams.set("section", filters.section);
    if (filters.timing) url.searchParams.set("timing", filters.timing);
    if (filters.status) url.searchParams.set("status", filters.status);
    return url.toString();
  }, [page, pageSize, debouncedSearch, filters]);
  [1];

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
  [1];

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);
  [1];

  // Map server rows to DataTable cells (badges and formatting)
  const rows = useMemo(() => {
    return (data?.rows ?? []).map((r) => ({
      // Keep original fields for action handlers (id lookup)
      ...r,
      centre_name: r.centre?.name || "",
      section:
        r.section === "JR" ? (
          <Badge color="pink" className="uppercase">
            JR
          </Badge>
        ) : (
          <Badge color="purple" className="uppercase">
            SR
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
        ? new Date(r.dateCreated).toLocaleDateString()
        : "",
      dateClosed: r.dateClosed
        ? new Date(r.dateClosed).toLocaleDateString()
        : "",
      monthlyAllowance: `₹ ${r.monthlyAllowance.toLocaleString("en-IN")}`,
    }));
  }, [data]);

  // Create → POST /api/admin/classrooms
  const handleCreate = async (payload: {
    centre_id?: string;
    centre_name: string;
    section_code: string; // "Junior" | "Senior"
    street_address: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    monthly_allowance: number | "";
    timing: string; // "Morning" | "Evening"
    status: "Active" | "Inactive";
    date_created: string; // YYYY-MM-DD
    date_closed: string; // YYYY-MM-DD or ""
  }) => {
    try {
      setLoading(true);
      setError(null);

      // Prefer deterministic id from modal; fallback to trimmed name lookup only if needed
      let centreId = payload.centre_id?.trim();
      const centreName = payload.centre_name?.trim();

      if (!centreId) {
        const centreRes = await fetch(
          `/api/admin/centres?page=1&pageSize=1&q=${encodeURIComponent(
            centreName
          )}`,
          { cache: "no-store" }
        );
        if (!centreRes.ok) throw new Error(await centreRes.text());
        const centreJson = await centreRes.json();
        const centre = centreJson.rows?.[0];
        if (!centre)
          throw new Error("Centre not found. Please select a valid centre.");
        centreId = centre.id;
      }

      // Map modal fields to API payload
      const body = {
        centreId,
        section: payload.section_code.toUpperCase().startsWith("J")
          ? "JR"
          : "SR",
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

  // Update → PUT /api/admin/classrooms/:id
  const handleUpdate = async (
    classroom_id: string,
    payload: {
      centre_id?: string;
      centre_name: string;
      section_code: string;
      street_address: string;
      city: string;
      district: string;
      state: string;
      pincode: string;
      monthly_allowance: number | "";
      timing: string;
      status: "Active" | "Inactive";
      date_created: string;
      date_closed: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Prefer deterministic id from modal; fallback to trimmed name lookup only if needed
      let centreId = payload.centre_id?.trim();
      const centreName = payload.centre_name?.trim();

      if (!centreId) {
        const centreRes = await fetch(
          `/api/admin/centres?page=1&pageSize=1&q=${encodeURIComponent(
            centreName
          )}`,
          { cache: "no-store" }
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
          : "SR",
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

  // Delete → DELETE /api/admin/classrooms/:id
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

  return (
    <RBACGate roles={["ADMIN"]}>
      <h2 className="text-2xl font-semibold mb-4">Classrooms</h2>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1); // reset paging on query change
          }}
          placeholder="Search classrooms..."
        />
        <div className="flex-1 flex justify-end gap-4">
          <AddButton
            label="Add Classroom"
            onClick={() => setCreateOpen(true)}
          />
          <FilterDropdown
            filters={[...classroomFilters]}
            onFilterChange={(f) => {
              setFilters(f);
              setPage(1); // reset paging on filters
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
                centre_id: editRow.centreId, // allow modal to carry the id
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

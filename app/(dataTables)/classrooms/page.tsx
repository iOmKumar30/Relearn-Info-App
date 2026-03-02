"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import ClassroomCreateModal from "@/components/CreateModals/ClassroomCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import CentreSelectAll from "@/components/CrudControls/CentreSelectAll";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import FilterDropdown from "@/components/CrudControls/FilterDropdown";
import SearchBar from "@/components/CrudControls/SearchBar";
import StateSelect from "@/components/CrudControls/StateSelect";
import RBACGate from "@/components/RBACGate";
import type { FilterOption } from "@/types/filterOptions";
import { Badge, Button } from "flowbite-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ClassroomRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ClassroomRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    total: number;
    rows: ClassroomRow[];
  } | null>(null);
  const debouncedSearch = useDebounce(search, 800);

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

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      toast.error(e?.message || "Failed to load classrooms", {
        id: "fetch-error",
      });
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const rawRows = useMemo(() => data?.rows ?? [], [data]);

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

  async function fetchAllClassrooms(): Promise<Record<string, any>[]> {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];
    const toastId = toast.loading("Preparing export...", {
      id: "export-loading",
    });

    try {
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
        if (pageAll > 200) break;
      }
      toast.success("Export successful", { id: toastId });
      return out;
    } catch (e: any) {
      toast.error(e?.message || "Failed to export classrooms", { id: toastId });
      throw e;
    }
  }

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

  const handleCreate = async (payload: any) => {
    const toastId = toast.loading("Creating classroom...", {
      id: "create-classroom",
    });
    try {
      setLoading(true);

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
      toast.success("Classroom created successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create classroom", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (classroom_id: string, payload: any) => {
    const toastId = toast.loading("Updating classroom...", {
      id: "update-classroom",
    });
    try {
      setLoading(true);

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
      toast.success("Classroom updated successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update classroom", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!deleteRow?.id) return;
    const toastId = toast.loading("Deleting classroom...", {
      id: "delete-classroom",
    });
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/classrooms/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setDeleteOpen(false);
      setDeleteRow(null);
      toast.success("Classroom deleted successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete classroom", { id: toastId });
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

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (page > 1) params.set("page", String(page));

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, filters, page, pathname, router]);

  return (
    <RBACGate roles={["ADMIN"]}>
      <h2 className="text-2xl font-semibold mb-4">Classrooms</h2>

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

      {loading && !data ? (
        <div className="flex justify-center items-center h-[50vh]">
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

      <ClassroomCreateModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

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

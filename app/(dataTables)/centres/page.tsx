"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import CentreCreateModal from "@/components/CreateModals/CentreCreateModal";
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

type CentreRow = {
  id: string;
  code: string;
  name: string;
  streetAddress: string;
  city: string | null;
  district: string | null;
  state: string;
  pincode: string;
  status: "ACTIVE" | "INACTIVE";
  dateAssociated: string;
  dateLeft: string | null;
  // NEW: facilitator received from API
  facilitator: {
    assignmentId: string;
    userId: string;
    name: string | null;
    email: string | null;
    startDate: string;
  } | null;
};

// Table columns: Facilitator inserted right after Street Address
const columns = [
  { key: "code", label: "Centre Code" },
  { key: "name", label: "Name" },
  { key: "streetAddress", label: "Street Address" },
  { key: "facilitator", label: "Facilitator" }, // NEW
  { key: "city", label: "City" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
  { key: "status", label: "Status" },
  { key: "dateAssociated", label: "Date Associated" },
  { key: "dateLeft", label: "Date Left" },
];

// Filters config for UI
const centreFilters: FilterOption[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["ACTIVE", "INACTIVE"],
  },
  { key: "state", label: "State", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "district", label: "District", type: "text" },
];

export default function CentresPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<CentreRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<CentreRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; rows: CentreRow[] } | null>(
    null
  );
  const debouncedSearch = useDebounce(search, 800);

  // Build query string for list endpoint
  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/centres", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    if (filters.status) url.searchParams.set("status", filters.status);
    if (filters.state) url.searchParams.set("state", filters.state);
    if (filters.city) url.searchParams.set("city", filters.city);
    if (filters.district) url.searchParams.set("district", filters.district);
    return url.toString();
  }, [page, pageSize, debouncedSearch, filters]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      setError(e?.message || "Failed to load centres");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Render-friendly mapping (status badge, date formatting, facilitator cell)
  const rows = useMemo(() => {
    return (data?.rows ?? []).map((r) => {
      // Facilitator cell UI
      const facCell = r.facilitator ? (
        <div className="flex flex-col">
          <span className="font-medium text-gray-800">
            {r.facilitator.name || "Unnamed"}
          </span>
          {r.facilitator.email && (
            <span className="text-xs text-gray-600">{r.facilitator.email}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">—</span>
          <Badge color="warning">Add</Badge>
        </div>
      );

      return {
        ...r,
        facilitator: facCell, // map object → JSX
        status: (
          <Badge
            color={r.status === "ACTIVE" ? "success" : "gray"}
            className="uppercase"
          >
            {r.status}
          </Badge>
        ),
        dateAssociated: r.dateAssociated
          ? new Date(r.dateAssociated).toLocaleDateString("en-GB")
          : "",
        dateLeft: r.dateLeft
          ? new Date(r.dateLeft).toLocaleDateString("en-GB")
          : "",
      };
    });
  }, [data]);

  // Create handler
  const handleCreate = async (payload: any) => {
    try {
      setLoading(true);
      setError(null);

      const body = {
        name: String(payload?.name || "").trim(),
        streetAddress: String(
          payload?.street_address ?? payload?.streetAddress ?? ""
        ).trim(),
        city: payload?.city ? String(payload.city).trim() : null,
        district: payload?.district ? String(payload.district).trim() : null,
        state: String(payload?.state || "").trim(),
        pincode: String(payload?.pincode || "").trim(),
        status:
          String(payload?.status || "ACTIVE").toUpperCase() === "INACTIVE"
            ? "INACTIVE"
            : "ACTIVE",
        dateAssociated:
          payload?.date_associated ?? payload?.dateAssociated ?? "",
        dateLeft: payload?.date_left
          ? String(payload.date_left).trim() || null
          : payload?.dateLeft
          ? String(payload.dateLeft).trim() || null
          : null,
      };

      // Normalize dates
      if (
        typeof body.dateAssociated === "string" &&
        body.dateAssociated.length > 0
      ) {
        // keep as string; backend can parse
      } else if (!body.dateAssociated) {
        body.dateAssociated = new Date().toISOString();
      }
      if (typeof body.dateLeft === "string" && body.dateLeft.length === 0) {
        body.dateLeft = null;
      }

      // required checks
      if (!body.name || !body.streetAddress || !body.state || !body.pincode) {
        throw new Error(
          "Please fill name, street address, state, and pincode."
        );
      }

      const res = await fetch("/api/admin/centres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchRows();
      setCreateOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create centre");
    } finally {
      setLoading(false);
    }
  };

  // Update handler
  const handleUpdate = async (centreId: string, payload: any) => {
    try {
      setLoading(true);
      setError(null);
      const body = {
        ...(payload?.name !== undefined && {
          name: String(payload.name).trim(),
        }),
        ...(payload?.streetAddress !== undefined && {
          streetAddress: String(payload.streetAddress).trim(),
        }),
        ...(payload?.street_address !== undefined && {
          streetAddress: String(payload.street_address).trim(),
        }),
        ...(payload?.city !== undefined && {
          city: payload.city ? String(payload.city).trim() : null,
        }),
        ...(payload?.district !== undefined && {
          district: payload.district ? String(payload.district).trim() : null,
        }),
        ...(payload?.state !== undefined && {
          state: String(payload.state).trim(),
        }),
        ...(payload?.pincode !== undefined && {
          pincode: String(payload.pincode).trim(),
        }),
        ...(payload?.status !== undefined && {
          status:
            String(payload.status).toUpperCase() === "INACTIVE"
              ? "INACTIVE"
              : "ACTIVE",
        }),
        ...(payload?.dateAssociated !== undefined && {
          dateAssociated:
            typeof payload.dateAssociated === "string" &&
            payload.dateAssociated.length > 0
              ? payload.dateAssociated
              : new Date().toISOString(),
        }),
        ...(payload?.date_associated !== undefined && {
          dateAssociated:
            typeof payload.date_associated === "string" &&
            payload.date_associated.length > 0
              ? payload.date_associated
              : new Date().toISOString(),
        }),
        ...(payload?.dateLeft !== undefined && {
          dateLeft: String(payload.dateLeft).trim() || null,
        }),
        ...(payload?.date_left !== undefined && {
          dateLeft: String(payload.date_left).trim() || null,
        }),
      };

      if ("name" in body && !body.name)
        throw new Error("Name cannot be empty.");
      if ("streetAddress" in body && !body.streetAddress)
        throw new Error("Street address cannot be empty.");
      if ("state" in body && !body.state)
        throw new Error("State cannot be empty.");
      if ("pincode" in body && !body.pincode)
        throw new Error("Pincode cannot be empty.");

      const res = await fetch(`/api/admin/centres/${centreId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchRows();
      setEditOpen(false);
      setEditRow(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update centre");
    } finally {
      setLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteRow?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/centres/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setDeleteOpen(false);
      setDeleteRow(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete centre");
    } finally {
      setLoading(false);
    }
  };

  // Row actions: Edit + Delete buttons
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
      <h2 className="mb-4 text-2xl font-semibold">Centres</h2>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search centres..."
        />
        <div className="flex-1 flex justify-end gap-4">
          <AddButton label="Add Centre" onClick={() => setCreateOpen(true)} />
          <FilterDropdown
            filters={centreFilters}
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
            router.push(`/centres/${encodeURIComponent(row.id)}`)
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
      <CentreCreateModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Edit modal */}
      <CentreCreateModal
        open={editOpen}
        mode="edit"
        initialValues={
          editRow
            ? {
                centre_id: editRow.id,
                name: editRow.name,
                street_address: editRow.streetAddress,
                city: editRow.city ?? "",
                district: editRow.district ?? "",
                state: editRow.state,
                pincode: editRow.pincode,
                status: editRow.status === "ACTIVE" ? "Active" : "Inactive",
                date_associated: editRow.dateAssociated
                  ? new Date(editRow.dateAssociated).toISOString().slice(0, 10)
                  : "",
                date_left: editRow.dateLeft
                  ? new Date(editRow.dateLeft).toISOString().slice(0, 10)
                  : "",
              }
            : undefined
        }
        onUpdate={(id, payload) => handleUpdate(id, payload)}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
      />

      {/* Delete confirm modal */}
      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Centre"
        message={`Are you sure you want to delete centre ${
          deleteRow?.code || ""
        }? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteRow(null);
        }}
        onConfirm={handleDelete}
        processing={loading}
      />
    </RBACGate>
  );
}

"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import UserCreateModal from "@/components/CreateModals/UserCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import {
  AppRole,
  mapBackendRolesToUi,
  mapUiRolesToBackend,
  ROLE_LABELS,
} from "@/libs/roles";
import { Badge, Button, Pagination } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

type Row = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: "ACTIVE" | "INACTIVE";
  onboardingStatus: string;
  roles: string[]; // Backend RoleName[] from API
  createdAt?: string;
};

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "roles", label: "Roles" },
  { key: "status", label: "Status" },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);
  const debouncedSearch = useDebounce(search, 800);

  // Build list URL with pagination and search
  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/users", window.location.origin);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    return url.toString();
  }, [page, pageSize, debouncedSearch]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Render-friendly mapping: Convert backend roles to UI labels
  const rows = useMemo(() => {
    return (data?.rows ?? []).map((u) => {
      const uiRoleLabels = mapBackendRolesToUi(u.roles as any); // Convert backend → UI

      return {
        ...u,
        roles: (
          <>
            {uiRoleLabels.map((label: string) => (
              <Badge key={label} color="info" className="mr-1 uppercase">
                {label}
              </Badge>
            ))}
          </>
        ),
        status: (
          <Badge
            color={u.status === "ACTIVE" ? "success" : "gray"}
            className="uppercase"
          >
            {u.status}
          </Badge>
        ),
      };
    });
  }, [data]);

  // Create user: Convert UI roles → backend before sending
  const handleCreate = async (payload: {
    name: string;
    email: string;
    phone: string;
    address: string;
    status: "ACTIVE" | "INACTIVE";
    roles: AppRole[]; // UI labels from modal
  }) => {
    try {
      setLoading(true);
      setError(null);

      const body = {
        name: payload.name?.trim(),
        email: payload.email?.trim(),
        phone: payload.phone?.trim(),
        address: payload.address?.trim(),
        roles: mapUiRolesToBackend(payload.roles), // Convert UI → backend
      };

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setCreateOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // Update user (profile/status only; roles not updated here)
  const handleUpdate = async (
    user_id: string,
    payload: {
      name: string;
      email: string;
      phone: string;
      address: string;
      status: "ACTIVE" | "INACTIVE";
      roles: AppRole[]; // ignored
    }
  ) => {
    try {
      setLoading(true);
      setError(null);
      const body: any = {
        name: payload.name?.trim(),
        phone: payload.phone?.trim(),
        address: payload.address?.trim(),
        status: payload.status,
      };
      const res = await fetch(`/api/admin/users/${user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setEditOpen(false);
      setEditRow(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!deleteRow?.id) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchRows();
      setDeleteOpen(false);
      setDeleteRow(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  // Actions column (Edit/Delete)
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
  const router = useRouter();

  return (
    <RBACGate roles={["ADMIN"]}>
      <h2 className="text-2xl font-semibold mb-4">Users</h2>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search users by name, email, or phone..."
        />
        <div className="flex-1 flex justify-end">
          <AddButton label="Add User" onClick={() => setCreateOpen(true)} />
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
          onRowClick={(row: any) => router.push(`/users/${row.id}`)}
          page={page}
          pageSize={pageSize}
        />
      )}

      {/* Pager (Flowbite Pagination) */}
      <div className="mt-3 flex overflow-x-auto sm:justify-end">
        <Pagination
          currentPage={page}
          onPageChange={(p: number) => setPage(p)}
          totalPages={totalPages}
          showIcons
        />
      </div>

      {/* Create modal */}
      <UserCreateModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onCreate={(payload) =>
          handleCreate({
            ...payload,
            roles: Array.isArray(payload.roles) ? payload.roles : [],
          })
        }
      />

      {/* Edit modal (profile/status only; roles ignored) */}
      <UserCreateModal
        open={editOpen}
        mode="edit"
        initialValues={{
          user_id: editRow?.id,
          name: editRow?.name || "",
          email: editRow?.email || "",
          phone: editRow?.phone || "",
          address: editRow?.address || "",
          status: editRow?.status,
          roles: mapBackendRolesToUi((editRow?.roles as any) || []).map(
            (role) => ROLE_LABELS[role] as AppRole
          ),
        }}
        onUpdate={(user_id, payload) => handleUpdate(user_id, payload as any)}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
      />

      {/* Delete confirm modal */}
      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete User"
        message={`Are you sure you want to delete user ${
          deleteRow?.email || ""
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

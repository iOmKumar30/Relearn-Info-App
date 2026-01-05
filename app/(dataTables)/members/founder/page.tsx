"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import FounderMemberCreateModal from "@/components/CreateModals/FounderMemberCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Button, Spinner } from "flowbite-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function FounderMembersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 600);

  // Initialize loading to true for immediate spinner
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/members/founder?q=${debouncedSearch}`
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json.rows || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not load founder members");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleCreate = async (formData: any) => {
    const loadingToast = toast.loading("Creating founder...");
    try {
      const res = await fetch("/api/admin/members/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Founder member created successfully", {
        id: loadingToast,
      });
      await fetchMembers();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to create founder: ${err.message}`, {
        id: loadingToast,
      });
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    const loadingToast = toast.loading("Updating founder...");
    try {
      const res = await fetch(`/api/admin/members/founder/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Founder member updated successfully", {
        id: loadingToast,
      });
      await fetchMembers();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to update founder: ${err.message}`, {
        id: loadingToast,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    const loadingToast = toast.loading("Deleting founder...");
    try {
      const res = await fetch(`/api/admin/members/founder/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Founder member deleted successfully", {
        id: loadingToast,
      });
      setDeleteOpen(false);
      setDeleteRow(null);
      await fetchMembers();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to delete founder: ${err.message}`, {
        id: loadingToast,
      });
    }
  };

  const columns = useMemo(
    () => [
      { key: "memberId", label: "ID" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Mobile" },
      { key: "pan", label: "PAN" },
      { key: "joiningDate", label: "Joining Date" },
      { key: "actions", label: "Actions" },
    ],
    []
  );

  const rows = useMemo(() => {
    return data.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      name: row.user?.name || "—",
      email: row.user?.email || "—",
      phone: row.user?.phone || "—",
      pan: row.pan || "—",
      joiningDate: new Date(row.joiningDate).toLocaleDateString("en-GB"),
      __raw: row, // Pass full object for edit
    }));
  }, [data]);

  const renderActions = (row: any) => {
    return (
      <div className="flex gap-2">
        <Button
          size="xs"
          color="light"
          onClick={() => {
            setEditRow(row.__raw);
            setEditOpen(true);
          }}
        >
          Edit
        </Button>
        <Button
          size="xs"
          color="failure"
          onClick={() => {
            setDeleteRow(row.__raw);
            setDeleteOpen(true);
          }}
        >
          Delete
        </Button>
      </div>
    );
  };

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6 relative">
        {/* Toast Container */}
        <Toaster position="top-right" reverseOrder={false} />

        <h2 className="text-2xl font-semibold mb-4 text-purple-700">
          Founder Members
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search founders..."
          />
          <div className="flex-1 flex justify-end gap-3">
            <AddButton
              label="Add Founder"
              onClick={() => setCreateOpen(true)}
            />
          </div>
        </div>

        {/* LOADING STATE HANDLING */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="xl" aria-label="Loading founders" />
            <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
          </div>
        ) : (
          <DataTable
            columns={columns.filter((c) => c.key !== "actions")}
            rows={rows}
            actions={renderActions}
            page={1}
            pageSize={100} // No real pagination needed for < 10 founders
          />
        )}

        <FounderMemberCreateModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />

        <FounderMemberCreateModal
          open={editOpen}
          mode="edit"
          initialValues={editRow}
          onClose={() => {
            setEditOpen(false);
            setEditRow(null);
          }}
          onUpdate={handleUpdate}
        />

        <ConfirmDeleteModal
          open={deleteOpen}
          title="Delete Founder"
          message={`Delete ${deleteRow?.name}?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteOpen(false);
            setDeleteRow(null);
          }}
        />
      </div>
    </RBACGate>
  );
}

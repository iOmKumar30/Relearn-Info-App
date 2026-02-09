"use client";

import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import MemberSelect from "@/components/CrudControls/MemberSelect";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Button } from "flowbite-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { HiPlus, HiTrash } from "react-icons/hi";

export default function GoverningBodyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchGbMembers = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/admin/members/gb", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      if (search) url.searchParams.set("q", search);

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json.rows || []);
      setTotal(json.total || 0);
    } catch (e) {
      toast.error("Failed to load Governing Body members", {
        id: "gb-load-error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchGbMembers();
  }, [fetchGbMembers]);

  const handleAddMember = async () => {
    if (!selectedMember) return;

    const toastId = toast.loading("Adding member...");

    try {
      setIsAdding(true);
      const res = await fetch("/api/admin/members/gb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMember.id, action: "add" }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Member added to Governing Body", { id: toastId });

      setSelectedMember(null);
      fetchGbMembers();
    } catch (e: any) {
      toast.error(e.message || "Failed to add member", { id: toastId });
    } finally {
      setIsAdding(false);
    }
  };

  const confirmRemoveMember = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!deleteId) return;

    const toastId = toast.loading("Removing member...");
    setIsDeleting(true);

    try {
      const res = await fetch("/api/admin/members/gb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: deleteId, action: "remove" }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Member removed from Governing Body", { id: toastId });
      fetchGbMembers();

      setDeleteOpen(false);
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { key: "memberId", label: "Member ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "memberType", label: "Type" },
    { key: "joiningDate", label: "Since" },
  ];

  const rows = data.map((d) => ({
    ...d,
    memberType: <Badge color="info">{d.memberType}</Badge>,
    joiningDate: new Date(d.joiningDate).toLocaleDateString("en-GB"),
  }));

  const renderActions = (row: any) => (
    <Button
      size="xs"
      color="failure"
      onClick={() => confirmRemoveMember(row.id)}
      title="Remove from Governing Body"
    >
      <HiTrash className="w-4 h-4" />
    </Button>
  );

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Governing Body Members
        </h1>

        {/* Toolbar Line */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-lg">
          {/* Left: Table Search */}
          <div className="w-full md:w-1/3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search GB members..."
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <div className="w-full md:w-64">
              <MemberSelect
                value={selectedMember}
                onChange={setSelectedMember}
                placeholder="Search member to add..."
                disabled={isAdding}
              />
            </div>
            <Button
              onClick={handleAddMember}
              disabled={!selectedMember || isAdding}
              color="blue"
              className="whitespace-nowrap"
            >
              <HiPlus className="mr-2 h-5 w-5" />
              Add
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          actions={renderActions}
          page={page}
          pageSize={pageSize}
        />

        {/* Pagination */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            size="xs"
            color="gray"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm self-center">Page {page}</span>
          <Button
            size="xs"
            color="gray"
            disabled={data.length < pageSize || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
        <ConfirmDeleteModal
          open={deleteOpen}
          title="Remove from Governing Body"
          message="Are you sure you want to remove this member from the Governing Body? They will remain a regular member."
          confirmLabel="Remove"
          processing={isDeleting}
          onCancel={() => {
            setDeleteOpen(false);
            setDeleteId(null);
          }}
          onConfirm={handleRemoveMember}
        />
      </div>
    </RBACGate>
  );
}

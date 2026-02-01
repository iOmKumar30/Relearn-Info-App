"use client";

import ProjectCreateModal from "@/components/CreateModals/ProjectCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Button, Spinner } from "flowbite-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiPencil, HiTrash } from "react-icons/hi";

export default function ProjectsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects?q=${search}`);
      const json = await res.json();
      setData(json.rows || []);
    } catch (error) {
      setData([]);
      toast.error("Failed to fetch projects");
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const handleCreate = async (payload: any) => {
    await fetch("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    fetchProjects();
  };

  const handleUpdate = async (id: string, payload: any) => {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    fetchProjects();
  };

  const handleDelete = async () => {
    if (deleteRow) {
      await fetch(`/api/projects/${deleteRow.id}`, { method: "DELETE" });
    }
    setDeleteOpen(false);
    fetchProjects();
  };

  const rows = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        const yearA = parseInt(String(a.year).slice(0, 4));
        const yearB = parseInt(String(b.year).slice(0, 4));

        return yearB - yearA; // descending (latest first)
      })
      .map((r) => ({
        ...r,
        displayTitle: (
          <Link
            href={`/projects/${r.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {r.title}
          </Link>
        ),
        displayStatus: (
          <Badge
            color={r.status === "COMPLETED" ? "success" : "warning"}
            className="w-fit"
          >
            {r.status}
          </Badge>
        ),
        funds: r.funds ? `₹${r.funds}` : "—",
        sponsoredBy: r.sponsoredBy || "—",
      }));
  }, [data]);

  const columns = useMemo(
    () => [
      { key: "displayTitle", label: "Project Title" }, // Changed key
      { key: "displayStatus", label: "Status" }, // Changed key
      { key: "year", label: "Year" },
      { key: "funds", label: "Funds (Lakhs)" },
      { key: "sponsoredBy", label: "Sponsor" },
    ],
    [],
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black">
            Organization Projects
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track all ongoing and completed initiatives.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <AddButton
            label="Create Project"
            onClick={() => setCreateOpen(true)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by title, sponsor, or year..."
        />
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" aria-label="Loading projects..." />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          actions={(row) => (
            <div className="flex gap-2">
              <RBACGate roles={["ADMIN", "FACILITATOR", "RELF_EMPLOYEE"]}>
                <Button
                  size="xs"
                  className="bg-white border-black/10 hover:bg-gray-100"
                  onClick={() => {
                    const originalRow = data.find((d) => d.id === row.id);
                    setEditRow(originalRow);
                    setEditOpen(true);
                  }}
                  title="Edit"
                >
                  <HiPencil className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                  size="xs"
                  color="failure"
                  onClick={() => {
                    setDeleteRow(row);
                    setDeleteOpen(true);
                  }}
                  title="Delete"
                >
                  <HiTrash className="h-4 w-4" />
                </Button>
              </RBACGate>
            </div>
          )}
          page={1}
          pageSize={100}
        />
      )}

      {/* Modals */}
      <ProjectCreateModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <ProjectCreateModal
        open={editOpen}
        mode="edit"
        initialValues={editRow}
        onClose={() => setEditOpen(false)}
        onUpdate={handleUpdate}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteRow?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Project"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

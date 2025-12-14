"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import AnnualMemberCreateModal from "@/components/CreateModals/AnnualMemberCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Button } from "flowbite-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getDynamicFiscalYears } from "@/libs/fiscalYears";

export default function AnnualMembersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 600);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ rows: any[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  // Fetch logic
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedSearch,
      });
      const res = await fetch(`/api/admin/members/annual?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Create Handler
  const handleCreate = async (formData: any) => {
    const res = await fetch("/api/admin/members/annual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error(await res.text());
    await fetchMembers();
  };

  // Update Handler
  const handleUpdate = async (id: string, formData: any) => {
    const res = await fetch(`/api/admin/members/annual/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error(await res.text());
    await fetchMembers();
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deleteRow) return;
    const res = await fetch(`/api/admin/members/annual/${deleteRow.id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(await res.text());
    setDeleteOpen(false);
    setDeleteRow(null);
    await fetchMembers();
  };

  // Prepare Columns
  const columns = useMemo(() => {
    const fiscalYears = getDynamicFiscalYears(2020);
    const baseCols = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Mobile" },
      { key: "pan", label: "PAN" },
      { key: "joiningDate", label: "Joining Date" },
    ];
    // Add dynamic fiscal year columns
    const feeCols = fiscalYears.map((yr) => ({
      key: `fee_${yr}`,
      label: yr,
    }));
    return [...baseCols, ...feeCols, { key: "actions", label: "Actions" }];
  }, []);

  // Prepare Rows
  const rows = useMemo(() => {
    const fiscalYears = getDynamicFiscalYears(2020);
    if (!data?.rows) return [];
    return data.rows.map((row) => {
      const feesMap = row.feesMap || {};

      // Flatten fee dates into row keys like 'fee_2023-2024'
      const feeCells: any = {};
      fiscalYears.forEach((yr) => {
        const dateStr = feesMap[yr];
        // Format date simply as DD/MM/YYYY or '—'
        feeCells[`fee_${yr}`] = dateStr
          ? new Date(dateStr).toLocaleDateString("en-GB")
          : "—";
      });

      return {
        id: row.id,
        name: row.user?.name || "—",
        email: row.user?.email || "—",
        phone: row.user?.phone || "—",
        pan: row.pan || "—",
        joiningDate: new Date(row.joiningDate).toLocaleDateString("en-GB"),
        ...feeCells,
        // Keep raw data for Edit Modal
        __raw: row,
      };
    });
  }, [data]);

  // Actions Renderer
  const renderActions = (row: any) => {
    // We need the raw original object to pass initial values to Edit Modal
    const rawData = row.__raw;
    return (
      <div className="flex gap-2">
        <Button
          size="xs"
          color="light"
          onClick={() => {
            setEditRow(rawData);
            setEditOpen(true);
          }}
        >
          Edit
        </Button>
        <Button
          size="xs"
          color="failure"
          onClick={() => {
            setDeleteRow(rawData);
            setDeleteOpen(true);
          }}
        >
          Delete
        </Button>
      </div>
    );
  };

  // Helper for Export All (Needed for ExportXlsxButton)
  const fetchAllForExport = async () => {
    // Simple fetch all without pagination logic for brevity,
    // or implement loop if dataset > 1000. Assuming <1000 for now or single page big fetch.
    const res = await fetch(
      `/api/admin/members/annual?page=1&pageSize=2000&q=${debouncedSearch}`
    );
    const json = await res.json();

    // Format for export
    return json.rows.map((r: any) => {
      const fiscalYears = getDynamicFiscalYears(2020);
      const flat: any = {
        Name: r.user?.name,
        Email: r.user?.email,
        Mobile: r.user?.phone,
        PAN: r.pan,
        "Joining Date": new Date(r.joiningDate).toLocaleDateString("en-GB"),
      };
      fiscalYears.forEach((yr) => {
        flat[yr] = r.feesMap?.[yr]
          ? new Date(r.feesMap[yr]).toLocaleDateString("en-GB")
          : "";
      });
      return flat;
    });
  };

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Annual Members</h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search name, email, PAN..."
          />
          <div className="flex-1 flex justify-end gap-3">
            <ExportXlsxButton
              fileName="AnnualMembers"
              sheetName="Annual Members"
              fetchAll={fetchAllForExport}
              visibleRows={rows.map((r) => {
                return r;
              })}
              columns={[]}
            />
            <AddButton label="Add Member" onClick={() => setCreateOpen(true)} />
          </div>
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}

        <DataTable
          columns={columns.filter((c) => c.key !== "actions")} // Main columns
          rows={rows}
          actions={renderActions}
          page={page}
          pageSize={pageSize}
        />

        {/* Pagination Controls (Simple) */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            size="xs"
            color="gray"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-sm self-center">Page {page}</span>
          <Button
            size="xs"
            color="gray"
            disabled={rows.length < pageSize}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>

        <AnnualMemberCreateModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />

        <AnnualMemberCreateModal
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
          title="Delete Member"
          message={`Are you sure you want to delete member ${deleteRow?.name}? This action cannot be undone.`}
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

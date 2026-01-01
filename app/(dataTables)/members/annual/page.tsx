"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import AnnualMemberCreateModal from "@/components/CreateModals/AnnualMemberCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import FiscalYearSelectModal from "@/components/CrudControls/FiscalYearSelectModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Button } from "flowbite-react";
import { Filter, X } from "lucide-react";
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

  // NEW: Fiscal Year Filter States
  const [fiscalYearModalOpen, setFiscalYearModalOpen] = useState(false);
  const [selectedFiscalYears, setSelectedFiscalYears] = useState<string[]>([]);
  const [pendingPaymentMode, setPendingPaymentMode] = useState(false);

  // All available fiscal years (sorted descending)
  const allFiscalYears = useMemo(() => {
    return getDynamicFiscalYears(2020).reverse(); // Descending order
  }, []);

  // Fetch logic
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedSearch,
      });

      // Add fiscal year filter if active
      if (selectedFiscalYears.length > 0) {
        params.set("fiscalYears", selectedFiscalYears.join(","));
      }

      // Add pending payment filter
      if (pendingPaymentMode) {
        params.set("pendingOnly", "true");
      }

      const res = await fetch(`/api/admin/members/annual?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    selectedFiscalYears,
    pendingPaymentMode,
  ]);

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

  // NEW: Handle Fiscal Year Selection
  const handleApplyFiscalYears = (years: string[]) => {
    // Sort selected years in descending order
    const sorted = years.sort((a, b) => b.localeCompare(a));
    setSelectedFiscalYears(sorted);
    setPage(1); // Reset to first page
  };

  // NEW: Open Fiscal Year Modal for Normal View
  const handleSelectColumns = () => {
    setPendingPaymentMode(false);
    setFiscalYearModalOpen(true);
  };

  // NEW: Open Fiscal Year Modal for Pending Payment Filter
  const handlePendingPayment = () => {
    setPendingPaymentMode(true);
    setFiscalYearModalOpen(true);
  };

  // NEW: Clear Filters
  const handleClearFilter = () => {
    setSelectedFiscalYears([]);
    setPendingPaymentMode(false);
    setPage(1);
  };

  // Prepare Columns (only selected fiscal years or all if none selected)
  const columns = useMemo(() => {
    const baseCols = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Mobile" },
      { key: "pan", label: "PAN" },
      { key: "joiningDate", label: "Joining Date" },
    ];

    // Only show selected fiscal years, or none if empty
    const yearsToShow =
      selectedFiscalYears.length > 0 ? selectedFiscalYears : [];

    const feeCols = yearsToShow.map((yr) => ({
      key: `fee_${yr}`,
      label: yr,
    }));

    return [...baseCols, ...feeCols, { key: "actions", label: "Actions" }];
  }, [selectedFiscalYears]);

  // Prepare Rows
  const rows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.map((row) => {
      const feesMap = row.feesMap || {};

      // Flatten fee dates for SELECTED fiscal years only
      const feeCells: any = {};
      selectedFiscalYears.forEach((yr) => {
        const dateStr = feesMap[yr];
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
        __raw: row,
      };
    });
  }, [data, selectedFiscalYears]);

  // Actions Renderer
  const renderActions = (row: any) => {
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

  // Helper for Export All
  const fetchAllForExport = async () => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "2000",
      q: debouncedSearch,
    });

    if (selectedFiscalYears.length > 0) {
      params.set("fiscalYears", selectedFiscalYears.join(","));
    }
    if (pendingPaymentMode) {
      params.set("pendingOnly", "true");
    }

    const res = await fetch(`/api/admin/members/annual?${params}`);
    const json = await res.json();

    return json.rows.map((r: any) => {
      const yearsToExport =
        selectedFiscalYears.length > 0 ? selectedFiscalYears : allFiscalYears;
      const flat: any = {
        Name: r.user?.name,
        Email: r.user?.email,
        Mobile: r.user?.phone,
        PAN: r.pan,
        "Joining Date": new Date(r.joiningDate).toLocaleDateString("en-GB"),
      };
      yearsToExport.forEach((yr) => {
        flat[yr] = r.feesMap?.[yr]
          ? new Date(r.feesMap[yr]).toLocaleDateString("en-GB")
          : "";
      });
      return flat;
    });
  };

  const isFilterActive = selectedFiscalYears.length > 0 || pendingPaymentMode;

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
            {/* NEW: Select Columns Button */}
            <Button color="light" size="sm" onClick={handleSelectColumns}>
              <Filter className="w-4 h-4 mr-2" />
              Select Columns
            </Button>

            {/* NEW: Pending Payment Button */}
            <Button color="warning" size="sm" onClick={handlePendingPayment}>
              Pending Payment
            </Button>

            {/* NEW: Clear Filter Button (shown only when filter is active) */}
            {isFilterActive && (
              <Button color="failure" size="sm" onClick={handleClearFilter}>
                <X className="w-4 h-4 mr-2" />
                Clear Filter
              </Button>
            )}

            <ExportXlsxButton
              fileName="AnnualMembers"
              sheetName="Annual Members"
              fetchAll={fetchAllForExport}
              visibleRows={rows}
              columns={[]}
            />
            <AddButton label="Add Member" onClick={() => setCreateOpen(true)} />
          </div>
        </div>

        {/* Show Active Filter Info */}
        {isFilterActive && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Active Filter:</strong>{" "}
              {pendingPaymentMode
                ? `Showing members with pending payments for: ${selectedFiscalYears.join(
                    ", "
                  )}`
                : `Showing columns: ${selectedFiscalYears.join(", ")}`}
            </p>
          </div>
        )}

        {error && <div className="text-red-600 mb-4">{error}</div>}

        <DataTable
          columns={columns.filter((c) => c.key !== "actions")}
          rows={rows}
          actions={renderActions}
          page={page}
          pageSize={pageSize}
        />

        {/* Pagination Controls */}
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

        {/* Modals */}
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

        {/* NEW: Fiscal Year Selection Modal */}
        <FiscalYearSelectModal
          open={fiscalYearModalOpen}
          availableYears={allFiscalYears}
          selectedYears={selectedFiscalYears}
          onClose={() => setFiscalYearModalOpen(false)}
          onApply={handleApplyFiscalYears}
        />
      </div>
    </RBACGate>
  );
}

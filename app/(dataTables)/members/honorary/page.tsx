"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import HonoraryMemberCreateModal from "@/components/CreateModals/HonoraryMemberCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import FiscalYearSelectModal from "@/components/CrudControls/FiscalYearSelectModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { getDynamicFiscalYears } from "@/libs/fiscalYears";
import { Button, Spinner } from "flowbite-react";
import { Filter, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function HonoraryMembersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 600);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Initialize loading to true so it shows spinner immediately
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ rows: any[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  // Filters
  const [fiscalYearModalOpen, setFiscalYearModalOpen] = useState(false);
  const [selectedFiscalYears, setSelectedFiscalYears] = useState<string[]>([]);
  const [pendingPaymentMode, setPendingPaymentMode] = useState(false);

  const allFiscalYears = useMemo(
    () => getDynamicFiscalYears(2020).reverse(),
    []
  );

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedSearch,
      });
      if (selectedFiscalYears.length > 0)
        params.set("fiscalYears", selectedFiscalYears.join(","));
      if (pendingPaymentMode) params.set("pendingOnly", "true");

      const res = await fetch(`/api/admin/members/honorary?${params}`);
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

  const handleCreate = async (formData: any) => {
    await fetch("/api/admin/members/honorary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    await fetchMembers();
  };

  const handleUpdate = async (id: string, formData: any) => {
    await fetch(`/api/admin/members/honorary/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    await fetchMembers();
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    await fetch(`/api/admin/members/honorary/${deleteRow.id}`, {
      method: "DELETE",
    });
    setDeleteOpen(false);
    setDeleteRow(null);
    await fetchMembers();
  };

  const handleApplyFiscalYears = (years: string[]) => {
    setSelectedFiscalYears(years.sort((a, b) => b.localeCompare(a)));
    setPage(1);
  };
  const handleSelectColumns = () => {
    setPendingPaymentMode(false);
    setFiscalYearModalOpen(true);
  };
  const handlePendingPayment = () => {
    setPendingPaymentMode(true);
    setFiscalYearModalOpen(true);
  };
  const handleClearFilter = () => {
    setSelectedFiscalYears([]);
    setPendingPaymentMode(false);
    setPage(1);
  };

  const columns = useMemo(() => {
    const baseCols = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Mobile" },
      { key: "pan", label: "PAN" },
      { key: "joiningDate", label: "Joining Date" },
    ];
    const yearsToShow =
      selectedFiscalYears.length > 0 ? selectedFiscalYears : [];
    const feeCols = yearsToShow.map((yr) => ({ key: `fee_${yr}`, label: yr }));
    return [...baseCols, ...feeCols, { key: "actions", label: "Actions" }];
  }, [selectedFiscalYears]);

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.map((row) => {
      // Use full fees map to access both date and amount
      const feesMapFull = row.feesMapFull || {};

      const feeCells: any = {};
      selectedFiscalYears.forEach((yr) => {
        const feeData = feesMapFull[yr];

        if (feeData && feeData.paidOn) {
          const dateStr = new Date(feeData.paidOn).toLocaleDateString("en-GB");
          const amountStr = feeData.amount ? `(₹${feeData.amount})` : "";

          // Render detailed cell
          feeCells[`fee_${yr}`] = (
            <div className="flex flex-col items-start text-xs">
              <span className="font-medium text-gray-900">{dateStr}</span>
              {amountStr && (
                <span className="text-green-600 font-semibold">
                  {amountStr}
                </span>
              )}
            </div>
          );
        } else {
          feeCells[`fee_${yr}`] = <span className="text-gray-400">—</span>;
        }
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

  const renderActions = (row: any) => (
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

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "2000",
      q: debouncedSearch,
    });
    if (selectedFiscalYears.length > 0)
      params.set("fiscalYears", selectedFiscalYears.join(","));
    if (pendingPaymentMode) params.set("pendingOnly", "true");
    const res = await fetch(`/api/admin/members/honorary?${params}`);
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

      const feesMapFull = r.feesMapFull || {};
      yearsToExport.forEach((yr) => {
        const feeData = feesMapFull[yr];
        if (feeData && feeData.paidOn) {
          const dateStr = new Date(feeData.paidOn).toLocaleDateString("en-GB");
          const amtStr = feeData.amount ? ` (₹${feeData.amount})` : "";
          flat[yr] = `${dateStr}${amtStr}`;
        } else {
          flat[yr] = "";
        }
      });
      return flat;
    });
  };

  const isFilterActive = selectedFiscalYears.length > 0 || pendingPaymentMode;

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4 text-purple-700">
          Honorary Members
        </h2>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search honorary members..."
          />
          <div className="flex-1 flex justify-end gap-3">
            <Button color="light" size="sm" onClick={handleSelectColumns}>
              <Filter className="w-4 h-4 mr-2" /> Select Columns
            </Button>
            <Button color="warning" size="sm" onClick={handlePendingPayment}>
              Pending Payment
            </Button>
            {isFilterActive && (
              <Button color="failure" size="sm" onClick={handleClearFilter}>
                <X className="w-4 h-4 mr-2" /> Clear Filter
              </Button>
            )}
            <ExportXlsxButton
              fileName="HonoraryMembers"
              sheetName="Honorary Members"
              fetchAll={fetchAllForExport}
              visibleRows={rows}
              columns={[]}
            />
            <AddButton
              label="Add Honorary Member"
              onClick={() => setCreateOpen(true)}
            />
          </div>
        </div>

        {isFilterActive && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Active Filter:</strong>{" "}
            {pendingPaymentMode
              ? `Showing pending payments: ${selectedFiscalYears.join(", ")}`
              : `Showing columns: ${selectedFiscalYears.join(", ")}`}
          </div>
        )}

        {error && <div className="text-red-600 mb-4">{error}</div>}

        {/* LOADING STATE HANDLING */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="xl" aria-label="Loading members" />
            <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns.filter((c) => c.key !== "actions")}
              rows={rows}
              actions={renderActions}
              page={page}
              pageSize={pageSize}
            />

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
                disabled={!data || data.rows.length < pageSize}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}

        <HonoraryMemberCreateModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
        <HonoraryMemberCreateModal
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
          message={`Delete ${deleteRow?.name}?`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteOpen(false);
            setDeleteRow(null);
          }}
        />
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

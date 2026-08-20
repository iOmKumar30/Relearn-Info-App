"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import FounderMemberCreateModal from "@/components/CreateModals/FounderMemberCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import FiscalYearSelectModal from "@/components/CrudControls/FiscalYearSelectModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { getDynamicFiscalYears } from "@/libs/fiscalYears";
import { Button, Spinner } from "flowbite-react";
import { Filter, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function FounderMembersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 600);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ rows: any[] } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  const [fiscalYearModalOpen, setFiscalYearModalOpen] = useState(false);
  const [selectedFiscalYears, setSelectedFiscalYears] = useState<string[]>([]);
  const [pendingPaymentMode, setPendingPaymentMode] = useState(false);
  const allFiscalYears = useMemo(() => getDynamicFiscalYears(2020).reverse(), []);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ q: debouncedSearch });
      if (selectedFiscalYears.length > 0) {
        params.set("fiscalYears", selectedFiscalYears.join(","));
      }
      if (pendingPaymentMode) params.set("pendingOnly", "true");

      const res = await fetch(`/api/admin/members/founder?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (error) {
      console.error(error);
      toast.error("Could not load founder members");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pendingPaymentMode, selectedFiscalYears]);

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
      toast.success("Founder member created successfully", { id: loadingToast });
      await fetchMembers();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to create founder: ${error.message}`, {
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
      toast.success("Founder member updated successfully", { id: loadingToast });
      await fetchMembers();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to update founder: ${error.message}`, {
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
      toast.success("Founder member deleted successfully", { id: loadingToast });
      setDeleteOpen(false);
      setDeleteRow(null);
      await fetchMembers();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to delete founder: ${error.message}`, {
        id: loadingToast,
      });
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { key: "memberId", label: "ID" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Mobile" },
      { key: "pan", label: "PAN" },
      { key: "joiningDate", label: "Joining Date" },
      { key: "status", label: "Status" },
    ];
    const feeColumns = selectedFiscalYears.map((fiscalYear) => ({
      key: `fee_${fiscalYear}`,
      label: fiscalYear,
    }));
    return [...baseColumns, ...feeColumns, { key: "actions", label: "Actions" }];
  }, [selectedFiscalYears]);

  const rows = useMemo(() => {
    return (data?.rows || []).map((row) => {
      const feeCells: Record<string, React.ReactNode> = {};
      selectedFiscalYears.forEach((fiscalYear) => {
        const fee = row.feesMapFull?.[fiscalYear];
        feeCells[`fee_${fiscalYear}`] = fee?.paidOn ? (
          <div className="flex flex-col items-start text-xs">
            <span className="font-medium text-gray-900">
              {new Date(fee.paidOn).toLocaleDateString("en-GB")}
            </span>
            {fee.amount !== null && fee.amount !== undefined && (
              <span className="font-semibold text-green-600">₹{fee.amount}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );
      });

      return {
        id: row.id,
        memberId: row.memberId,
        name: row.user?.name || "—",
        email: row.user?.email || "—",
        phone: row.user?.phone || "—",
        pan: row.pan || "—",
        joiningDate: row.joiningDate
          ? new Date(row.joiningDate).toLocaleDateString("en-GB")
          : "—",
        status: row.user?.status === "INACTIVE" ? "Inactive" : "Active",
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

  const filtersActive = selectedFiscalYears.length > 0 || pendingPaymentMode;

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="relative p-6">
        <h2 className="mb-4 text-2xl font-semibold text-purple-700">
          Founder Members
        </h2>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search founders..."
          />
          <div className="flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:justify-end">
            <Button
              color="light"
              size="sm"
              onClick={() => {
                setPendingPaymentMode(false);
                setFiscalYearModalOpen(true);
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Select Years
            </Button>
            <Button
              color="warning"
              size="sm"
              onClick={() => {
                setPendingPaymentMode(true);
                setFiscalYearModalOpen(true);
              }}
            >
              Pending Payment
            </Button>
            {filtersActive && (
              <Button
                color="failure"
                size="sm"
                onClick={() => {
                  setSelectedFiscalYears([]);
                  setPendingPaymentMode(false);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filter
              </Button>
            )}
            <AddButton label="Add Founder" onClick={() => setCreateOpen(true)} />
          </div>
        </div>

        {filtersActive && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Active Filter:</strong>{" "}
              {pendingPaymentMode
                ? `Showing founders with pending payments for: ${selectedFiscalYears.join(", ")}`
                : `Showing fee columns: ${selectedFiscalYears.join(", ")}`}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="xl" aria-label="Loading founders" />
            <p className="mt-2 text-sm text-gray-500">Loading data...</p>
          </div>
        ) : (
          <DataTable
            columns={columns.filter((column) => column.key !== "actions")}
            rows={rows}
            actions={renderActions}
            page={1}
            pageSize={100}
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
        <FiscalYearSelectModal
          open={fiscalYearModalOpen}
          availableYears={allFiscalYears}
          selectedYears={selectedFiscalYears}
          onClose={() => setFiscalYearModalOpen(false)}
          onApply={(years) => setSelectedFiscalYears([...years].sort((a, b) => b.localeCompare(a)))}
        />
      </div>
    </RBACGate>
  );
}

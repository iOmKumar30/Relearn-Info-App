"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import InternCreateModal from "@/components/CreateModals/InternCreateModal";
import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Button, Spinner, Tooltip } from "flowbite-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function InternsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 600);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Initialize loading to true
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ rows: any[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  const fetchInterns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous table errors
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedSearch,
      });

      const res = await fetch(`/api/admin/members/interns?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch interns");
      toast.error("Could not load interns data");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchInterns();
  }, [fetchInterns]);

  const handleCreate = async (formData: any) => {
    const loadingToast = toast.loading("Creating intern...");
    try {
      const res = await fetch("/api/admin/members/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Intern created successfully", { id: loadingToast });
      await fetchInterns();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to create: ${err.message}`, { id: loadingToast });
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    const loadingToast = toast.loading("Updating intern...");
    try {
      const res = await fetch(`/api/admin/members/interns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Intern updated successfully", { id: loadingToast });
      await fetchInterns();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to update: ${err.message}`, { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    const loadingToast = toast.loading("Deleting intern...");
    try {
      const res = await fetch(`/api/admin/members/interns/${deleteRow.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success("Intern deleted successfully", { id: loadingToast });
      setDeleteOpen(false);
      setDeleteRow(null);
      await fetchInterns();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to delete: ${err.message}`, { id: loadingToast });
    }
  };

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "5000",
      q: debouncedSearch,
    });
    const res = await fetch(`/api/admin/members/interns?${params}`);
    const json = await res.json();

    // Map for Excel
    return json.rows.map((r: any) => ({
      Name: r.name,
      Email: r.email,
      Mobile: r.mobile,
      Address: r.address,
      Gender: r.gender,
      DOB: r.dateOfBirth
        ? new Date(r.dateOfBirth).toLocaleDateString("en-GB")
        : "",
      "Education Completed": r.educationCompleted,
      Institution: r.institution,
      "Ongoing Course": r.ongoingCourse,
      "Areas of Interest": r.areasOfInterest,
      "Joining Date": r.joiningDate
        ? new Date(r.joiningDate).toLocaleDateString("en-GB")
        : "",
      "Completion Date": r.completionDate
        ? new Date(r.completionDate).toLocaleDateString("en-GB")
        : "",
      "Preferred Hours": r.preferredHoursPerDay,
      "Working Mode": r.workingMode,
      "Associated After": r.associatedAfter ? "Yes" : "No",
      Comments: r.comments,
      Status: r.status,
      "Fee Amount": r.feeAmount,
      "Fee Paid Date": r.feePaidDate
        ? new Date(r.feePaidDate).toLocaleDateString("en-GB")
        : "",
      "Payment Status": r.paymentStatus,
    }));
  };

  const columns = useMemo(
    () => [
      { key: "memberId", label: "ID" },
      { key: "name", label: "Name & Gender" },
      { key: "contact", label: "Contact Info" },
      { key: "education", label: "Education & Interest" },
      { key: "dates", label: "Timeline" },
      { key: "work", label: "Work & Mode" },
      { key: "fee", label: "Fee & Status" },
      { key: "meta", label: "Meta" }, // Comments/Association
      { key: "actions", label: "Actions" },
    ],
    []
  );

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.map((row) => ({
      id: row.id,
      memberId: (
        <span className="text-md text-black font-bold">
          {row.memberId || "-"}
        </span>
      ),
      name: (
        <div>
          <div className="font-semibold text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500">
            {row.gender ? row.gender : "Gender: N/A"} •{" "}
            {row.dateOfBirth
              ? `DOB: ${new Date(row.dateOfBirth).toLocaleDateString("en-GB")}`
              : "DOB: N/A"}
          </div>
        </div>
      ),
      contact: (
        <div className="flex flex-col text-sm">
          {/* Email Fix: Forced width with truncation */}
          {row.email && (
            <div
              className="text-blue-600 font-medium truncate w-[180px]"
              title={row.email}
            >
              {row.email}
            </div>
          )}

          {row.mobile && <div className="text-gray-500">{row.mobile}</div>}

          {row.address && (
            <Tooltip content={row.address}>
              <div className="text-xs text-gray-400 truncate cursor-help w-[180px]">
                {row.address}
              </div>
            </Tooltip>
          )}

          {!row.email && !row.mobile && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
      education: (
        <div className="flex flex-col text-sm">
          <span className="font-medium">{row.institution || "—"}</span>
          <div className="text-xs text-gray-500">
            {row.ongoingCourse && <span>Course: {row.ongoingCourse}</span>}
            {row.educationCompleted && (
              <span className="block">Completed: {row.educationCompleted}</span>
            )}
            {row.areasOfInterest && (
              <Tooltip content={row.areasOfInterest}>
                <div className="text-xs text-gray-400 truncate cursor-help w-[180px]">
                  {row.areasOfInterest}
                </div>
              </Tooltip>
            )}
          </div>
        </div>
      ),
      dates: (
        <div className="text-xs text-gray-600">
          <div>
            Join:{" "}
            {row.joiningDate
              ? new Date(row.joiningDate).toLocaleDateString("en-GB")
              : "—"}
          </div>
          {row.completionDate && (
            <div>
              End: {new Date(row.completionDate).toLocaleDateString("en-GB")}
            </div>
          )}
        </div>
      ),
      work: (
        <div className="text-xs">
          <div className="font-medium text-gray-700">
            {row.workingMode || "Mode: N/A"}
          </div>
          {row.preferredHoursPerDay && (
            <div className="text-gray-500">{row.preferredHoursPerDay}</div>
          )}
        </div>
      ),
      fee: (
        <div className="flex flex-col gap-1">
          <Badge
            color={
              row.status === "ACTIVE"
                ? "success"
                : row.status === "COMPLETED"
                ? "info"
                : row.status === "PENDING_START"
                ? "warning"
                : "failure"
            }
            className="w-fit"
          >
            {row.status?.replace("_", " ") || "UNKNOWN"}
          </Badge>
          <div className="text-xs mt-1">
            <span
              className={
                row.paymentStatus === "PAID"
                  ? "text-green-600 font-bold"
                  : row.paymentStatus === "WAIVED"
                  ? "text-gray-500"
                  : "text-orange-600"
              }
            >
              {row.paymentStatus}
            </span>
            {row.feeAmount && (
              <span className="text-gray-500"> (₹{row.feeAmount})</span>
            )}
          </div>
          {row.feePaidDate && (
            <div className="text-[10px] text-gray-400">
              Paid: {new Date(row.feePaidDate).toLocaleDateString("en-GB")}
            </div>
          )}
        </div>
      ),
      meta: (
        <div className="text-xs text-gray-500 max-w-[150px]">
          <div>Associate: {row.associatedAfter ? "Yes" : "No"}</div>
          {row.comments && (
            <Tooltip content={row.comments}>
              <div className="truncate cursor-help italic border-b border-dotted border-gray-300 w-fit">
                Note
              </div>
            </Tooltip>
          )}
        </div>
      ),
      __raw: row,
    }));
  }, [data]);

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

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6 relative">


        <h2 className="text-2xl font-semibold mb-4 text-purple-700">
          Interns Directory
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name, email, institution..."
          />
          <div className="flex-1 flex justify-end gap-3">
            <ExportXlsxButton
              fileName="Interns_List"
              sheetName="Interns"
              fetchAll={fetchAllForExport}
              visibleRows={rows}
              columns={[]}
            />
            <AddButton label="Add Intern" onClick={() => setCreateOpen(true)} />
          </div>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="xl" aria-label="Loading data" />
            <p className="mt-2 text-gray-500 text-sm">Loading directory...</p>
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

        <InternCreateModal
          open={createOpen}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />

        <InternCreateModal
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
          title="Delete Intern"
          message={`Are you sure you want to remove ${deleteRow?.name}? This cannot be undone.`}
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

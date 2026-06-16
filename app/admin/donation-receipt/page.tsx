"use client";

import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import DonationFormModal from "@/components/donation/DonationFormModal";
import DonationPreviewModal from "@/components/donation/DonationPreviewModal";
import RBACGate from "@/components/RBACGate";
import { Badge, Button } from "flowbite-react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ClipLoader } from "react-spinners";
// 1. IMPORT NAVIGATION HOOKS
import { useRouter, useSearchParams } from "next/navigation";

type DonationRow = {
  id: string;
  receiptNumber: string;
  name: string;
  amount: number;
  date: string;
  email: string;
  transactionId: string;
  // ... other fields present in response
};

export default function DonationReceiptsPage() {
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- MODAL STATES ---
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedRow, setSelectedRow] = useState<DonationRow | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<DonationRow | null>(null);

  // --- DELETE STATES ---
  const [pendingDelete, setPendingDelete] = useState<DonationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 2. INITIALIZE HOOKS
  const searchParams = useSearchParams();
  const router = useRouter();
  const editIdParam = searchParams.get("editId");
  const hasOpenedRef = useRef<string | null>(null);

  // --- API URL ---
  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (q.trim()) sp.set("q", q.trim());
    return `/api/admin/donation-receipt/list?${sp.toString()}`;
  }, [page, pageSize, q]);

  // --- LOAD DATA ---
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json.rows || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      setErr(e?.message || "Failed to load donations");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  // 3. NEW EFFECT: Auto-open modal if editId is present
  useEffect(() => {
    if (editIdParam && hasOpenedRef.current !== editIdParam) {
      hasOpenedRef.current = editIdParam;

      const fetchAndOpen = async () => {
        const toastId = toast.loading("Opening donation receipt...");
        try {
          const res = await fetch(`/api/admin/donation-receipt/${editIdParam}`);
          if (!res.ok) throw new Error("Receipt not found");
          const fullData = await res.json();

          toast.dismiss(toastId);
          setSelectedRow(fullData);
          setFormMode("edit");
          setFormOpen(true);

          // Clear the URL so refreshing doesn't re-open the modal
          router.replace("/admin/donation-receipt");
        } catch (e) {
          toast.error("Could not load receipt from link", { id: toastId });
        }
      };

      fetchAndOpen();
    }
  }, [editIdParam, router]);

  // --- CREATE / UPDATE HANDLER ---
  const handleFormSubmit = async (data: any) => {
    try {
      let res;
      if (formMode === "create") {
        res = await fetch("/api/admin/donation-receipt", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Edit Mode
        if (!selectedRow?.id) return;
        res = await fetch(`/api/admin/donation-receipt/${selectedRow.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg);
        return;
      }

      toast.success(
        formMode === "create" ? "Donation Receipt Created" : "Donation Updated",
      );
      load();
      setFormOpen(false);
    } catch (e: any) {
      toast.error("Something went wrong");
    }
  };

  // --- OPEN EDIT ---
  const openEdit = (row: DonationRow) => {
    // Fetch full details (helper function)
    fetchFullAndOpen(row.id, "edit");
  };

  // --- OPEN PREVIEW ---
  const openPreview = (row: DonationRow) => {
    fetchFullAndOpen(row.id, "preview");
  };

  // Helper to fetch full details before opening modal
  const fetchFullAndOpen = async (id: string, type: "edit" | "preview") => {
    const toastId = toast.loading("Loading details...");
    try {
      const res = await fetch(`/api/admin/donation-receipt/${id}`);
      if (!res.ok) throw new Error("Failed");
      const fullData = await res.json();
      toast.dismiss(toastId);

      if (type === "edit") {
        setSelectedRow(fullData);
        setFormMode("edit");
        setFormOpen(true);
      } else {
        setPreviewRow(fullData);
        setPreviewOpen(true);
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Could not load details");
    }
  };

  // --- DELETE HANDLERS ---
  const confirmDelete = useCallback((row: DonationRow) => {
    setPendingDelete(row);
  }, []);

  const performDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      setDeletingId(pendingDelete.id);
      const res = await fetch(
        `/api/admin/donation-receipt/${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Deleted successfully");
      setPendingDelete(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, load]);

  return (
    <RBACGate roles={["ADMIN"]}>
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-[#8b7e4e]">
            Donation Receipts
          </h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <SearchBar
                value={q}
                onChange={(val) => {
                  setPage(1);
                  setQ(val);
                }}
                placeholder="Search Name / Receipt No..."
              />
            </div>
            <Button
              color="light"
              className="cursor-pointer"
              onClick={() => {
                setFormMode("create");
                setSelectedRow(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Receipt
            </Button>
          </div>
        </div>

        {err && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-red-700">
            {err}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 shadow-sm md:overflow-hidden">
          {/* Mobile View - Stacked Cards as Tiles */}
          <div className="space-y-3 bg-transparent md:hidden p-2">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 rounded-lg bg-white">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 13h6m-6 4h6M5 7h14M5 17h14M5 21h14"
                    />
                  </svg>
                  {loading ? (
                    <ClipLoader size={40} />
                  ) : (
                    <span>No donation receipts found.</span>
                  )}
                </div>
              </div>
            ) : (
              rows.map((r) => (
                <article
                  key={r.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Receipt No
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      <Badge color="gray">{r.receiptNumber}</Badge>
                    </p>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 mb-4">
                    <div className="min-w-0 border-t border-gray-200 pt-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Date
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-800">
                        {new Date(r.date).toLocaleDateString("en-GB")}
                      </dd>
                    </div>
                    <div className="min-w-0 border-t border-gray-200 pt-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Donor Name
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-800">
                        {r.name}
                        <div className="text-xs text-gray-500 font-normal">
                          {r.email}
                        </div>
                      </dd>
                    </div>
                    <div className="min-w-0 border-t border-gray-200 pt-3 flex gap-4">
                      <div className="flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Amount
                        </dt>
                        <dd className="mt-0.5 text-sm font-bold text-green-600">
                          ₹{Number(r.amount).toLocaleString("en-IN")}
                        </dd>
                      </div>
                      <div className="flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Txn ID
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-500 break-all">
                          {r.transactionId}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="border-t border-gray-200 pt-3 flex items-center gap-2">
                    <Button
                      size="xs"
                      color="light"
                      className="cursor-pointer flex-1"
                      onClick={() => openPreview(r)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>

                    <Button
                      size="xs"
                      color="light"
                      className="cursor-pointer flex-1"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>

                    <Button
                      size="xs"
                      className="cursor-pointer flex-1"
                      color="failure"
                      onClick={() => confirmDelete(r)}
                      disabled={deletingId === r.id}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {deletingId === r.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Desktop View - Traditional Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] bg-white text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2">Receipt No</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Donor Name</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Txn ID</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Badge color="gray">{r.receiptNumber}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {new Date(r.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {r.name}
                      <div className="text-xs text-gray-500 font-normal">
                        {r.email}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-bold text-green-600">
                      ₹{Number(r.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.transactionId}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          color="light"
                          className="cursor-pointer"
                          onClick={() => openPreview(r)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>

                        <Button
                          size="xs"
                          color="light"
                          className="cursor-pointer"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          size="xs"
                          className="cursor-pointer"
                          color="failure"
                          onClick={() => confirmDelete(r)}
                          disabled={deletingId === r.id}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {deletingId === r.id ? "..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-gray-500"
                      colSpan={6}
                    >
                      {loading ? (
                        <ClipLoader size={40} />
                      ) : (
                        "No donation receipts found."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm sm:justify-end">
          <span>
            Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <Button
            size="xs"
            color="light"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            size="xs"
            color="light"
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>

        {/* Modals */}
        <DonationFormModal
          open={formOpen}
          mode={formMode}
          initialValues={selectedRow}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />

        {previewRow && (
          <DonationPreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            data={previewRow}
          />
        )}

        <ConfirmDeleteModal
          open={!!pendingDelete}
          title="Confirm Deletion"
          message={
            pendingDelete
              ? `Delete receipt "${pendingDelete.receiptNumber}"? This cannot be undone.`
              : ""
          }
          confirmLabel="Delete"
          processing={!!deletingId}
          onCancel={() => setPendingDelete(null)}
          onConfirm={performDelete}
        />
      </div>
    </RBACGate>
  );
}

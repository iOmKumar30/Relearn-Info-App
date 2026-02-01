"use client";

import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import GstFormModal from "@/components/gst-receipt/GstFormModal";
import GstPreviewModal from "@/components/gst-receipt/GstPreviewModal";
import RBACGate from "@/components/RBACGate";
import { Badge, Button } from "flowbite-react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ClipLoader } from "react-spinners";
// 1. IMPORT NAVIGATION HOOKS
import { useRouter, useSearchParams } from "next/navigation";

type GstRow = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  billToName: string;
  placeOfSupply: string;
  totalAmount: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
  items?: any[];
  billToGstin?: string;
  dateOfSupply?: string;
  reverseCharge?: string;
  // ... other fields
};

export default function GstReceiptsPage() {
  const [rows, setRows] = useState<GstRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [selectedRow, setSelectedRow] = useState<GstRow | undefined>(undefined);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<GstRow | null>(null);

  const [pendingDelete, setPendingDelete] = useState<GstRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 2. INITIALIZE HOOKS
  const searchParams = useSearchParams();
  const router = useRouter();
  const editIdParam = searchParams.get("editId");

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (q.trim()) sp.set("q", q.trim());
    return `/api/admin/gst-receipt/list?${sp.toString()}`;
  }, [page, pageSize, q]);

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
      setErr(e?.message || "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  // 3. NEW EFFECT: Auto-open modal if editId is present
  useEffect(() => {
    if (editIdParam) {
      const fetchAndOpen = async () => {
        const toastId = toast.loading("Opening invoice...");
        try {
          const res = await fetch(`/api/admin/gst-receipt/${editIdParam}`);
          if (!res.ok) throw new Error("Receipt not found");
          const fullData = await res.json();

          toast.dismiss(toastId);
          setSelectedRow(fullData);
          setEditMode("edit");
          setFormOpen(true);

          // Clear the URL so refreshing doesn't re-open the modal
          router.replace("/admin/finance/gst-receipts");
        } catch (e) {
          toast.error("Could not load receipt from link", { id: toastId });
        }
      };

      fetchAndOpen();
    }
  }, [editIdParam, router]);

  const handleCreateOrUpdate = async (data: any) => {
    try {
      let res;
      if (editMode === "create") {
        // CREATE Logic
        res = await fetch("/api/admin/gst-receipt", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // EDIT Logic
        if (!selectedRow?.id) return;
        res = await fetch(`/api/admin/gst-receipt/${selectedRow.id}`, {
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
        editMode === "create" ? "Receipt Created" : "Receipt Updated",
      );
      load();
      setFormOpen(false); // Close modal on success
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const confirmDelete = useCallback((row: GstRow) => {
    setPendingDelete(row);
  }, []);

  const performDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      setDeletingId(pendingDelete.id);
      const res = await fetch(
        `/api/admin/gst-receipt/${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Deleted successfully");
      setPendingDelete(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete receipt");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, load]);

  const openCreate = () => {
    setEditMode("create");
    setSelectedRow(undefined);
    setFormOpen(true);
  };

  const openEdit = async (row: GstRow) => {
    const toastId = toast.loading("Loading details...");
    try {
      const res = await fetch(`/api/admin/gst-receipt/${row.id}`);
      if (!res.ok) throw new Error("Failed");
      const fullData = await res.json();
      toast.dismiss(toastId);

      setSelectedRow(fullData);
      setEditMode("edit");
      setFormOpen(true);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Could not load receipt details");
    }
  };

  const openPreview = async (row: GstRow) => {
    try {
      const res = await fetch(`/api/admin/gst-receipt/${row.id}`);
      if (!res.ok) throw new Error("Failed to load details");
      const fullData = await res.json();
      setPreviewRow(fullData);
      setPreviewOpen(true);
    } catch (e) {
      toast.error("Could not load receipt details");
    }
  };

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#8b7e4e]">GST Receipts</h1>
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SearchBar
                value={q}
                onChange={(val) => {
                  setPage(1);
                  setQ(val);
                }}
                placeholder="Search Invoice No / Bill To..."
              />
            </div>
            <Button
              color="light"
              className="cursor-pointer"
              onClick={openCreate}
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

        <div className="overflow-x-auto rounded border">
          <table className="min-w-full bg-white text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2">Invoice No</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Bill To</th>
                <th className="px-3 py-2">Grand Total</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Badge color="gray">{r.invoiceNo}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.invoiceDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {r.billToName}
                  </td>
                  <td className="px-3 py-2 font-bold">
                    ₹{r.grandTotal?.toFixed(2)}
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
                    colSpan={5}
                  >
                    {loading ? (
                      <ClipLoader size={40} />
                    ) : (
                      "No GST receipts found."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
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

        <GstFormModal
          open={formOpen}
          mode={editMode}
          initialValues={selectedRow}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreateOrUpdate}
        />

        {previewRow && (
          <GstPreviewModal
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
              ? `Delete receipt "${pendingDelete.invoiceNo}"? This cannot be undone.`
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

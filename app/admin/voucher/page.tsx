"use client";

import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import PaymentVoucherFormModal from "@/components/voucher/PaymentVoucherFormModal";
import PaymentVoucherPreviewModal from "@/components/voucher/PaymentVoucherPreviewModal";
import { Badge, Button } from "flowbite-react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ClipLoader } from "react-spinners";
import { useSearchParams, useRouter } from "next/navigation"; // 1. Import navigation hooks

type VoucherRow = {
  id: string;
  voucherNo: string;
  paymentDate: string;
  payeeName: string;
  projectName?: string;
  totalAmount: number;
  amountInWords: string;
  createdAt: string;
  items?: any[];
  expenditureHead?: string;
  paymentMode?: string;
  payeeMobile?: string;
};

export default function PaymentVoucherPage() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [selectedRow, setSelectedRow] = useState<VoucherRow | undefined>(
    undefined,
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<VoucherRow | null>(null);

  const [pendingDelete, setPendingDelete] = useState<VoucherRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 2. Initialize Hooks
  const searchParams = useSearchParams();
  const router = useRouter();
  const editIdParam = searchParams.get("editId");

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (q.trim()) sp.set("q", q.trim());
    return `/api/admin/voucher/list?${sp.toString()}`;
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
      setErr(e?.message || "Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  // 3. New Effect: Check for editId param and open modal automatically
  useEffect(() => {
    if (editIdParam) {
      const fetchAndOpen = async () => {
        const toastId = toast.loading("Opening voucher...");
        try {
          const res = await fetch(`/api/admin/voucher/${editIdParam}`);
          if (!res.ok) throw new Error("Voucher not found");
          const fullData = await res.json();

          toast.dismiss(toastId);
          setSelectedRow(fullData);
          setEditMode("edit");
          setFormOpen(true);

          // Remove the query param to prevent re-opening on refresh
          router.replace("/admin/finance/payment-vouchers");
        } catch (e) {
          toast.error("Could not load voucher from link", { id: toastId });
        }
      };

      fetchAndOpen();
    }
  }, [editIdParam, router]);

  const handleCreateOrUpdate = async (data: any) => {
    try {
      let res;
      if (editMode === "create") {
        res = await fetch("/api/admin/voucher", {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" },
        });
      } else {
        if (!selectedRow?.id) return;
        res = await fetch(`/api/admin/voucher/${selectedRow.id}`, {
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
        editMode === "create" ? "Voucher Created" : "Voucher Updated",
      );
      load();
      setFormOpen(false);
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const confirmDelete = useCallback((row: VoucherRow) => {
    setPendingDelete(row);
  }, []);

  const performDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      setDeletingId(pendingDelete.id);
      const res = await fetch(
        `/api/admin/voucher/${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Deleted successfully");
      setPendingDelete(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete voucher");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, load]);

  const openCreate = () => {
    setEditMode("create");
    setSelectedRow(undefined);
    setFormOpen(true);
  };

  const openEdit = async (row: VoucherRow) => {
    const toastId = toast.loading("Loading details...");
    try {
      const res = await fetch(`/api/admin/voucher/${row.id}`);
      if (!res.ok) throw new Error("Failed");
      const fullData = await res.json();
      toast.dismiss(toastId);

      setSelectedRow(fullData);
      setEditMode("edit");
      setFormOpen(true);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Could not load voucher details");
    }
  };

  const openPreview = async (row: VoucherRow) => {
    try {
      const res = await fetch(`/api/admin/voucher/${row.id}`);
      if (!res.ok) throw new Error("Failed to load details");
      const fullData = await res.json();
      setPreviewRow(fullData);
      setPreviewOpen(true);
    } catch (e) {
      toast.error("Could not load voucher details");
    }
  };

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#8b7e4e]">
            Payment Vouchers
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SearchBar
                value={q}
                onChange={(val) => {
                  setPage(1);
                  setQ(val);
                }}
                placeholder="Search Voucher No / Payee..."
              />
            </div>
            <Button
              color="light"
              className="cursor-pointer"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Voucher
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
                <th className="px-3 py-2">Voucher No</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Payee</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Total Amount</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Badge color="gray">{r.voucherNo}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.paymentDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {r.payeeName}
                  </td>
                  <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]">
                    {r.projectName || "-"}
                  </td>
                  <td className="px-3 py-2 font-bold">
                    ₹{r.totalAmount?.toFixed(2)}
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
                      "No payment vouchers found."
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

        <PaymentVoucherFormModal
          open={formOpen}
          mode={editMode}
          initialValues={selectedRow}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreateOrUpdate}
        />

        {previewRow && (
          <PaymentVoucherPreviewModal
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
              ? `Delete voucher "${pendingDelete.voucherNo}"? This cannot be undone.`
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

"use client";

import CertificateFormModal from "@/components/part-cert/CertificateFormModal";
import CertificatePreviewModal from "@/components/part-cert/CertificatePreviewModal";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Button } from "flowbite-react";
import { Download, Eye, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";

type Row = {
  id: string;
  certificateNo: string;
  name: string;
  aadhaar?: string;
  classYear: string;
  institute: string;
  duration: string;
  startDate: string;
  endDate: string;
  issueDate: string;
  createdAt: string;
};

export default function ParticipationCertificatesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<Row | null>(null);

  // delete flow state
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (q.trim()) sp.set("q", q.trim());
    return `/api/admin/part-cert/list?${sp.toString()}`;
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
      setErr(e?.message || "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (data: any) => {
    const res = await fetch("/api/admin/part-cert", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const msg = await res.text();
      toast.error(msg);
      return;
    }
    toast.success("Certificate Created");
    load();
  };

  const confirmDelete = useCallback((row: Row) => {
    setPendingDelete(row);
  }, []);

  const performDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      setDeletingId(pendingDelete.id);
      const res = await fetch(
        `/api/admin/part-cert/${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Deleted successfully");
      setPendingDelete(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete certificate");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, load]);

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Participation Certificates</h1>
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SearchBar
                value={q}
                onChange={(val) => {
                  setPage(1);
                  setQ(val);
                }}
                placeholder="Search name / institute..."
              />
            </div>
            <Button
              color="light"
              className="cursor-pointer"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Certificate
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
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Institute</th>
                <th className="px-3 py-2">Date Issued</th>
                <th className="px-3 py-2">Certificate No</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {r.name}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-gray-600 truncate max-w-[200px] block"
                      title={r.institute}
                    >
                      {r.institute}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.issueDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Badge color="gray">{r.certificateNo}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        color="light"
                        className="cursor-pointer"
                        onClick={() => {
                          setPreviewRow(r);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View
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
                      "No participation certificates found."
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

        <CertificateFormModal
          open={formOpen}
          mode="create"
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreate}
        />

        {previewRow && (
          <CertificatePreviewModal
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
              ? `Delete certificate for "${pendingDelete.name}"? This cannot be undone.`
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

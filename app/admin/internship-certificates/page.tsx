"use client";

import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import CertificateFormModal from "@/components/part-cert/CertificateFormModal";
import CertificatePreviewModal from "@/components/part-cert/CertificatePreviewModal";
import RBACGate from "@/components/RBACGate";
import { Badge, Button } from "flowbite-react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

// Reusing same Row type
type Row = {
  id: string;
  type: string;
  certificateNo: string;
  name: string;
  aadhaar?: string;
  classYear: string;
  institute: string;
  duration: string;
  eventName?: string;
  startDate: string;
  endDate: string;
  issueDate: string;
  createdAt: string;
};

export default function InternshipCertificatesPage() {
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

  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- FILTER BY TYPE: INTERNSHIP ---
  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    sp.set("type", "INTERNSHIP"); // <--- FILTER HERE
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
    toast.success("Internship Certificate Created");
    load();
  };

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
          <h1 className="text-xl font-semibold text-red-700">
            Internship Certificates
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SearchBar
                value={q}
                onChange={(val) => {
                  setPage(1);
                  setQ(val);
                }}
                placeholder="Search intern name..."
              />
            </div>
            <Button color="failure" onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Internship Cert
            </Button>
          </div>
        </div>

        {err && (
          <div className="mb-3 rounded bg-red-50 p-2 text-red-700">{err}</div>
        )}

        <div className="overflow-x-auto rounded border">
          <table className="min-w-full bg-white text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Institute</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Date Issued</th>
                <th className="px-3 py-2">Certificate No</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-gray-600">{r.institute}</td>
                  <td className="px-3 py-2">{r.duration}</td>
                  <td className="px-3 py-2">
                    {new Date(r.issueDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Badge color="failure">{r.certificateNo}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => {
                          setPreviewRow(r);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="mr-1 h-4 w-4" /> View
                      </Button>
                      <Button
                        size="xs"
                        color="failure"
                        onClick={() => setPendingDelete(r)}
                        disabled={deletingId === r.id}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    No internship certificates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls (same as before) */}

        <CertificateFormModal
          open={formOpen}
          mode="create"
          // Pre-fill type as INTERNSHIP so user doesn't have to select it
          initialValues={{ type: "INTERNSHIP" }}
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
          title="Delete Internship Certificate"
          message={`Delete certificate for "${pendingDelete?.name}"?`}
          confirmLabel="Delete"
          processing={!!deletingId}
          onCancel={() => setPendingDelete(null)}
          onConfirm={performDelete}
        />
      </div>
    </RBACGate>
  );
}

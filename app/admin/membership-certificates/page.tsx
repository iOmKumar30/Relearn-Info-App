"use client";

import CertificateFormModal from "@/components/certificates/CertificateFormModal";
import CertificatePreviewModal from "@/components/certificates/CertificatePreviewModal";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Button } from "flowbite-react";
import { Download, Eye, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

type Row = {
  id: string;
  name: string;
  year: string;
  dateIssued: string;
  certificateNo: string;
  createdAt: string;
};

export default function CertificatesAdminPage() {
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
    return `/api/admin/certificates/list?${sp.toString()}`;
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

  const confirmDelete = useCallback((row: Row) => {
    setPendingDelete(row);
  }, []);

  const performDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      setDeletingId(pendingDelete.id);
      const res = await fetch(
        `/api/admin/certificates/${encodeURIComponent(pendingDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await res.text());
      setPendingDelete(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to delete certificate");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDelete, load]);

  return (
    <RBACGate roles={["ADMIN"]}>
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold">Membership Certificates</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <SearchBar
                value={q}
                onChange={(val) => {
                  setPage(1);
                  setQ(val);
                }}
                placeholder="Search by name / number / year"
              />
            </div>
            <Button
              color="blue"
              className="cursor-pointer"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create 
            </Button>
          </div>
        </div>

        {err && (
          <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-red-700">
            {err}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 shadow-sm md:overflow-hidden">
          {/* Mobile View - Stacked Cards */}
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
                    <span>No certificates found.</span>
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
                      Certificate No
                    </p>
                    <p className="text-sm font-semibold text-gray-800">
                      <Badge color="gray">{r.certificateNo}</Badge>
                    </p>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 mb-4">
                    <div className="min-w-0 border-t border-gray-200 pt-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Name
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-800 font-medium">
                        {r.name}
                      </dd>
                    </div>
                    <div className="min-w-0 border-t border-gray-200 pt-3 flex gap-4">
                      <div className="flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Year
                        </dt>
                        <dd className="mt-0.5 text-sm">
                          <Badge color="indigo">{r.year}</Badge>
                        </dd>
                      </div>
                      <div className="flex-1">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Date
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-800">
                          {new Date(r.dateIssued).toLocaleDateString("en-GB")}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="border-t border-gray-200 pt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="xs"
                      color="light"
                      className="cursor-pointer flex-1 min-w-[30%]"
                      onClick={() => {
                        setPreviewRow(r);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>

                    <CertificateRowDownload
                      row={r}
                      className="flex-1 min-w-[30%]"
                    />

                    <Button
                      size="xs"
                      className="cursor-pointer flex-1 min-w-[30%]"
                      color="dark"
                      onClick={() => confirmDelete(r)}
                      disabled={deletingId === r.id}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {deletingId === r.id ? "Deleting…" : "Delete"}
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
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Year</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Certificate No</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      <Badge color="indigo">{r.year}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {new Date(r.dateIssued).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.certificateNo}
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

                        <CertificateRowDownload row={r} />

                        <Button
                          size="xs"
                          className="cursor-pointer"
                          color="dark"
                          onClick={() => confirmDelete(r)}
                          disabled={deletingId === r.id}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {deletingId === r.id ? "Deleting…" : "Delete"}
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
                        "No certificates found."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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

        <CertificateFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false);
            load();
          }}
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

function CertificateRowDownload({
  row,
  className,
}: {
  row: Row;
  className?: string;
}) {
  const handleDownload = async () => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = "1100px";
    document.body.appendChild(container);

    const rootEl = document.createElement("div");
    rootEl.id = "cert-download-root";
    container.appendChild(rootEl);

    const { createRoot } = await import("react-dom/client");
    const { default: React } = await import("react");
    const { default: CertificateCard } =
      await import("@/components/certificates/CertificateCard");
    const { downloadElementAsPDF } =
      await import("@/libs/pdf/downloadFromElement");

    const root = createRoot(rootEl);
    root.render(
      React.createElement(CertificateCard, {
        name: row.name,
        year: row.year,
        date: row.dateIssued,
      }),
    );

    await new Promise((res) => setTimeout(res, 350));

    const target = rootEl.querySelector(
      "#certificate-root",
    ) as HTMLElement | null;
    if (target) {
      await downloadElementAsPDF({
        element: target,
        filename: `${row.certificateNo}.pdf`,
        scale: 2,
      });
    }

    root.unmount();
    document.body.removeChild(container);
  };

  return (
    <Button
      size="xs"
      color="light"
      className={`cursor-pointer ${className || ""}`}
      onClick={handleDownload}
    >
      <Download className="mr-1 h-4 w-4" />
      Download
    </Button>
  );
}

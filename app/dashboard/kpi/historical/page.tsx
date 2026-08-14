"use client";

import AddButton from "@/components/CrudControls/AddButton";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import RBACGate from "@/components/RBACGate";
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { ArrowLeft, Calendar, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";

type YearRow = {
  year: number;
  createdAt: string;
  monthsWithData: number;
};

export default function KpiHistoricalPage() {
  const router = useRouter();
  const [rows, setRows] = useState<YearRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [yearInput, setYearInput] = useState("");
  const [deleteYear, setDeleteYear] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchYears = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/kpi/years", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json.rows || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load KPI years");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleCreate = async () => {
    const year = Number(yearInput);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      toast.error("Enter a valid year");
      return;
    }
    const t = toast.loading("Creating year...");
    try {
      const res = await fetch("/api/kpi/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Year created", { id: t });
      setCreateOpen(false);
      setYearInput("");
      await fetchYears();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create year", { id: t });
    }
  };

  const handleDelete = async () => {
    if (!deleteYear) return;
    const t = toast.loading("Deleting year...");
    try {
      setDeleting(true);
      const res = await fetch(`/api/kpi/years/${deleteYear}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Year deleted", { id: t });
      setDeleteOpen(false);
      setDeleteYear(null);
      await fetchYears();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete year", { id: t });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RBACGate roles={["ADMIN", "FACILITATOR", "TUTOR", "RELF_EMPLOYEE"]}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button color="light" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="mt-3 text-2xl font-semibold">Historical KPI Data</h1>
            <p className="text-sm text-gray-600">
              Browse KPI snapshots by year and month. Deleting a year removes
              it from this list but does not delete underlying KPI data.
            </p>
          </div>
          <RBACGate roles={["ADMIN"]}>
            <AddButton label="Add Year" onClick={() => setCreateOpen(true)} />
          </RBACGate>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <ClipLoader size={36} />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            No years found. Add a year to start tracking historical KPI data.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
              <div
                key={row.year}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/kpi/${row.year}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/dashboard/kpi/${row.year}`);
                  }
                }}
                className="cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Calendar Year
                    </div>
                    <div className="mt-1 text-3xl font-bold text-gray-900">
                      {row.year}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      FY{row.year}-{String(row.year + 1).slice(-2)}
                    </div>
                  </div>
                  <RBACGate roles={["ADMIN"]}>
                    <Button
                      color="failure"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteYear(row.year);
                        setDeleteOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </RBACGate>
                </div>

                <div className="mt-5 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs uppercase text-gray-500">
                    <Database className="h-3 w-3" />
                    Months with Data
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-800">
                    {row.monthsWithData}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      / 12
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal show={createOpen} onClose={() => setCreateOpen(false)} dismissible>
        <ModalHeader>Add KPI Year</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Year</Label>
              <TextInput
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                placeholder="e.g. 2026"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button color="gray" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button color="blue" onClick={handleCreate}>
                Add Year
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Year"
        message={`Remove ${deleteYear ?? ""} from the historical list? Underlying KPI data is not deleted.`}
        confirmLabel="Remove"
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteYear(null);
        }}
        onConfirm={handleDelete}
        processing={deleting}
      />
    </RBACGate>
  );
}

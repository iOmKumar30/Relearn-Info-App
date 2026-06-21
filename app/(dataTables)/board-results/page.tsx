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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";

type YearRow = {
  year: number;
  createdAt: string;
  resultsCount: number;
};

export default function BoardResultsYearsPage() {
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
      const res = await fetch("/api/admin/board-results/years", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setRows(json.rows || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load board result years");
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
      const res = await fetch("/api/admin/board-results/years", {
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
      const res = await fetch(`/api/admin/board-results/years/${deleteYear}`, {
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
    <RBACGate roles={["ADMIN"]}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Board Results</h1>
            <p className="text-sm text-gray-600">
              Manage board result years and their results. Deleting a year will
              also delete all results inside that year.
            </p>
          </div>
          <AddButton
            label="Create New Year"
            onClick={() => setCreateOpen(true)}
          />
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <ClipLoader size={36} />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            No board result years found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
              <div
                key={row.year}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/board-results/${row.year}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    router.push(`/board-results/${row.year}`);
                  }
                }}
                className="rounded-2xl border bg-white p-5 text-left shadow-sm transition cursor-pointer hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Passing Year</div>
                    <div className="mt-1 text-3xl font-bold">{row.year}</div>
                  </div>
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
                </div>

                <div className="mt-6 rounded-lg bg-gray-50 p-3">
                  <div className="text-xs uppercase text-gray-500">Results</div>
                  <div className="mt-1 text-lg font-semibold">
                    {row.resultsCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal show={createOpen} onClose={() => setCreateOpen(false)} dismissible>
        <ModalHeader>Create Board Result Year</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Year</Label>
              <TextInput
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                placeholder="e.g. 2026"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button color="gray" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button color="blue" onClick={handleCreate}>
                Create Year
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Year"
        message={`Are you sure you want to delete year ${deleteYear ?? ""}? All result rows inside this year will also be deleted.`}
        confirmLabel="Delete"
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

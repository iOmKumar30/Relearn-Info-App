"use client";

import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import EditTutorAssModal from "@/components/CrudControls/EditTutorAssModal";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import UserSelect from "@/components/CrudControls/UserSelect";
import { Badge, Button, Spinner } from "flowbite-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiPencil, HiTrash } from "react-icons/hi";

export default function ClassroomProfileClient({
  classroomId,
}: {
  classroomId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [classroom, setClassroom] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Selection for adding new tutor
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);

  // Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);

  async function fetchClassroom() {
    const res = await fetch(`/api/admin/classrooms/${classroomId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchAssignments(page = 1, pageSize = 50) {
    const res = await fetch(
      `/api/admin/assignments/tutor?classroomId=${encodeURIComponent(
        classroomId,
      )}&page=${page}&pageSize=${pageSize}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [c, a] = await Promise.all([fetchClassroom(), fetchAssignments()]);
      setClassroom(c);
      setAssignments(a.rows || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load classroom");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);


  // Add new Tutor
  async function handleAssign() {
    if (!pick?.id) return;
    const toastId = toast.loading("Adding tutor...");
    try {
      const res = await fetch(`/api/admin/assignments/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pick.id,
          classroomId,
          isSubstitute: false, // Default to assigned
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      setPick(null);
      toast.success("Tutor added", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to add tutor", { id: toastId });
    }
  }

  // Quick Close (End Now)
  async function closeAssignment(id: string) {
    const toastId = toast.loading("Closing assignment...");
    try {
      const res = await fetch(`/api/admin/assignments/tutor/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      toast.success("Assignment closed", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to close assignment", { id: toastId });
    }
  }

  // Edit Assignment (Dates & Type)
  async function handleUpdateAssignment(
    startDate: string,
    endDate: string | null,
    isSubstitute: boolean,
  ) {
    if (!editingAssignment) return;
    const toastId = toast.loading("Updating assignment...");
    try {
      setProcessing(true);
      const payload: any = {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isSubstitute,
      };

      const res = await fetch(
        `/api/admin/assignments/tutor/${editingAssignment.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error(await res.text());

      await load(true);
      setEditModalOpen(false);
      setEditingAssignment(null);
      toast.success("Updated successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Update failed", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  // Delete Assignment
  async function handleDeleteAssignment() {
    if (!assignmentToDelete) return;
    const toastId = toast.loading("Deleting assignment...");
    try {
      setProcessing(true);
      const res = await fetch(
        `/api/admin/assignments/tutor/${assignmentToDelete}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
      toast.success("Assignment deleted", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }


  const rows = useMemo(() => {
    return assignments.map((x) => ({
      id: x.id,
      tutor: x.user?.name
        ? `${x.user.name} — ${x.user.email}`
        : x.user?.email || x.userId,
      start: x.startDate
        ? new Date(x.startDate).toLocaleDateString("en-GB")
        : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString("en-GB") : "",
      // Map API "isSubstitute" to UI "Assigned" vs "Replacement"
      tag: x.isSubstitute ? "Replacement" : "Assigned",
      __raw: x,
    }));
  }, [assignments]);

  const renderActions = (row: any) => (
    <div className="flex gap-2">
      <Button
        size="xs"
        color="gray"
        onClick={() => {
          setEditingAssignment(row);
          setEditModalOpen(true);
        }}
        title="Edit"
      >
        <HiPencil className="h-4 w-4" />
      </Button>

      {!row.end && (
        <Button
          size="xs"
          color="warning"
          onClick={() => closeAssignment(row.id)}
          title="End Now"
        >
          End
        </Button>
      )}

      {row.end && (
        <Button
          size="xs"
          color="failure"
          onClick={() => {
            setAssignmentToDelete(row.id);
            setDeleteModalOpen(true);
          }}
          title="Delete History"
        >
          <HiTrash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  async function fetchAllTutorAssignments(): Promise<Record<string, any>[]> {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];
    while (true) {
      const res = await fetch(
        `/api/admin/assignments/tutor?classroomId=${encodeURIComponent(
          classroomId,
        )}&page=${pageAll}&pageSize=${pageSizeAll}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const rows: any[] = json?.rows || [];
      out.push(
        ...rows.map((x) => ({
          tutor: x.user?.name
            ? `${x.user.name} — ${x.user.email}`
            : x.user?.email || x.userId,
          start: x.startDate
            ? new Date(x.startDate).toLocaleDateString("en-GB")
            : "",
          end: x.endDate ? new Date(x.endDate).toLocaleDateString("en-GB") : "",
          type: x.isSubstitute ? "Replacement" : "Assigned",
        })),
      );
      if (rows.length < pageSizeAll) break;
      pageAll += 1;
      if (pageAll > 200) break;
    }
    return out;
  }


  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="xl" color="info" aria-label="Loading classroom data" />
          <div className="text-sm text-gray-600">Loading classroom data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-3">Classroom Profile</h2>

      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-red-700">
          {error}
        </div>
      )}

      {classroom && (
        <div className="mb-6 space-y-1">
          <div>Code: {classroom.code}</div>
          <div>
            Centre:{" "}
            {classroom.centre
              ? `${classroom.centre.code} — ${classroom.centre.name}`
              : "—"}
          </div>
          <div>
            Status:{" "}
            <Badge color="info" className="uppercase inline-block">
              {classroom.status}
            </Badge>
          </div>
          <div>Section: {classroom.section}</div>
          <div>Timing: {classroom.timing}</div>
          {/* Add other fields as needed */}
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-medium mb-2">Add Tutor</h3>
        <div className="flex gap-2">
          <div className="w-96">
            <UserSelect role="TUTOR" value={pick} onChange={setPick} />
          </div>
          <Button
            onClick={handleAssign}
            disabled={!pick}
            className="ml-4 inline-flex items-center"
            color="blue"
          >
            Add
          </Button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">Tutor Assignments</h3>
        <div className="z-100">
          <ExportXlsxButton
            fileName={`classroom_${classroom?.code || classroomId}_assignments`}
            sheetName="Tutor Assignments"
            columns={[
              { key: "tutor", label: "Tutor" },
              { key: "start", label: "Start" },
              { key: "end", label: "End" },
              { key: "type", label: "Type" },
            ]}
            visibleRows={[]}
            fetchAll={fetchAllTutorAssignments}
          />
        </div>
      </div>

      <DataTable
        columns={[
          { key: "tutor", label: "Tutor" },
          { key: "start", label: "Start" },
          { key: "end", label: "End" },
          { key: "tag", label: "Type" },
        ]}
        rows={rows}
        actions={renderActions}
        page={1}
        pageSize={100}
      />

      <EditTutorAssModal
        open={editModalOpen}
        assignment={editingAssignment}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateAssignment}
      />

      <ConfirmDeleteModal
        open={deleteModalOpen}
        title="Delete Assignment History"
        message="Are you sure you want to delete this assignment history? This cannot be undone."
        confirmLabel="Delete"
        processing={processing}
        onCancel={() => {
          setDeleteModalOpen(false);
          setAssignmentToDelete(null);
        }}
        onConfirm={handleDeleteAssignment}
      />
    </div>
  );
}

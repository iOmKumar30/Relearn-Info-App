"use client";

import DataTable from "@/components/CrudControls/Datatable";
import UserSelect from "@/components/CrudControls/UserSelect";
import { Badge, Button, Spinner } from "flowbite-react";
import { useEffect, useMemo, useState } from "react";

export default function ClassroomProfileClient({
  classroomId,
}: {
  classroomId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);

  async function fetchClassroom() {
    const res = await fetch(`/api/admin/classrooms/${classroomId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchAssignments() {
    const res = await fetch(
      `/api/admin/assignments/tutor?classroomId=${encodeURIComponent(
        classroomId
      )}&page=1&pageSize=10`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  const load = async () => {
    try {
      setLoading(true);
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

  const rows = useMemo(() => {
    return assignments.map((x) => ({
      id: x.id,
      tutor: x.user?.name
        ? `${x.user.name} — ${x.user.email}`
        : x.user?.email || x.userId,
      start: x.startDate ? new Date(x.startDate).toLocaleDateString() : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString() : "",
      tag: x.isSubstitute ? "Substitute" : "Primary",
      __raw: x,
    }));
  }, [assignments]);

  async function handleAssign() {
    if (!pick?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/assignments/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pick.id,
          classroomId,
          isSubstitute: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setPick(null);
    } catch (e: any) {
      setError(e?.message || "Failed to add tutor");
    } finally {
      setLoading(false);
    }
  }

  async function closeAssignment(id: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/assignments/tutor/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to close assignment");
    } finally {
      setLoading(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: "tutor", label: "Tutor" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
      { key: "tag", label: "Type" },
    ],
    []
  );

  const renderActions = (row: any) =>
    !row.end ? (
      <Button size="xs" color="light" onClick={() => closeAssignment(row.id)}>
        Close
      </Button>
    ) : null;

  // Central full-page loader to prevent partial rendering
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
            <Badge color="info" className="uppercase">
              {classroom.status}
            </Badge>
          </div>
          <div>Section: {classroom.section}</div>
          <div>Street Address: {classroom.streetAddress}</div>
          <div>City: {classroom.city}</div>
          <div>District: {classroom.district}</div>
          <div>State: {classroom.state}</div>
          <div>Pincode: {classroom.pincode}</div>
          <div>Timing: {classroom.timing}</div>
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
            disabled={!pick || loading}
            className="ml-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
          >
            Add
          </Button>
        </div>
      </div>

      <h3 className="font-medium mb-2">Tutor Assignments</h3>
      <DataTable columns={columns} rows={rows} actions={renderActions} />
    </div>
  );
}

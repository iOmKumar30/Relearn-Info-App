"use client";

import ClassroomSelect from "@/components/CrudControls/ClassroomSelect";
import DataTable from "@/components/CrudControls/Datatable"; 
import { Badge, Button } from "flowbite-react";
import { useEffect, useMemo, useState } from "react";

export default function UserProfileClient({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);

  async function fetchUser() {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  async function fetchAssignments() {
    setError(null);
    const res = await fetch(
      `/api/admin/assignments/tutor?userId=${encodeURIComponent(
        userId
      )}&page=1&pageSize=50`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  const load = async () => {
    try {
      setLoading(true);
      const [u, a] = await Promise.all([fetchUser(), fetchAssignments()]);
      setUser(u);
      setAssignments(a.rows || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isTutor = (user?.currentRoles || []).includes("TUTOR");

  const rows = useMemo(() => {
    return assignments.map((x) => ({
      id: x.id,
      classroom: x.classroom?.code || x.classroomId,
      centre: x.classroom?.centre
        ? `${x.classroom.centre.code} — ${x.classroom.centre.name}`
        : "",
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
          userId,
          classroomId: pick.id,
          isSubstitute: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setPick(null);
    } catch (e: any) {
      setError(e?.message || "Failed to assign classroom");
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
      { key: "classroom", label: "Classroom" },
      { key: "centre", label: "Centre" },
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

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-3">User Profile</h2>
      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-red-700">
          {error}
        </div>
      )}

      {user && (
        <div className="mb-6 space-y-1">
          <div>Name: {user.name ?? "—"}</div>
          <div>Email: {user.email}</div>
          <div>
            Roles:{" "}
            {(user.currentRoles || []).map((r: string) => (
              <Badge key={r} color="info" className="mr-1 uppercase">
                {r}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {isTutor && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">Assign Classroom</h3>
          <div className="flex gap-2">
            <div className="w-96">
              <ClassroomSelect value={pick} onChange={setPick} />
            </div>
            <Button
              onClick={handleAssign}
              disabled={!pick || loading}
              className="ml-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
            >
              Assign
            </Button>
          </div>
        </div>
      )}

      <h3 className="font-medium mb-2">Assignments</h3>
      <DataTable columns={columns} rows={rows} actions={renderActions} />
    </div>
  );
}

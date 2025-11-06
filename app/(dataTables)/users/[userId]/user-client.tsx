"use client";

import CentreSelect from "@/components/CrudControls/CentreSelect";
import ClassroomSelect from "@/components/CrudControls/ClassroomSelect";
import DataTable from "@/components/CrudControls/Datatable";
import { Badge, Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function UserProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);

  // Facilitator → Centre additions
  const [facCentreLinks, setFacCentreLinks] = useState<any[]>([]);
  const [pickCentre, setPickCentre] = useState<{
    id: string;
    label: string;
  } | null>(null);

  // New: FacilitatorEmployee links (two perspectives)
  const [employeeForFacilitator, setEmployeeForFacilitator] = useState<
    any | null
  >(null);
  const [facilitatorsForEmployee, setFacilitatorsForEmployee] = useState<any[]>(
    []
  );

  // Facilitator -> Centres -> Classroom Link
  const [facClassrooms, setFacClassrooms] = useState<any[]>([]);

  async function fetchUser() {
    const res = await fetch(`/api/admin/users/${userId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchAssignments() {
    const res = await fetch(
      `/api/admin/assignments/tutor?userId=${encodeURIComponent(
        userId
      )}&page=1&pageSize=50`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchFacilitatorCentreLinks() {
    const res = await fetch(
      `/api/admin/assignments/facilitator-centre?facilitatorId=${encodeURIComponent(
        userId
      )}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { rows: [] };
    return res.json();
  }

  async function fetchEmployeeForFacilitator() {
    const url = new URL(
      "/api/admin/assignments/employee-facilitators",
      window.location.origin
    );
    url.searchParams.set("facilitatorId", userId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { rows: [] };
    return res.json();
  }

  async function fetchFacilitatorsForEmployee() {
    const url = new URL(
      "/api/admin/assignments/employee-facilitators",
      window.location.origin
    );
    url.searchParams.set("employeeUserId", userId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { rows: [] };
    return res.json();
  }

  async function fetchClassroomsByCentres(centreIds: string[]) {
    if (!centreIds.length) return [];
    const url = new URL("/api/admin/classrooms", window.location.origin);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("centreId", centreIds.join(","));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.rows || [];
  }

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [u, a, fc, facSide, empSide] = await Promise.all([
        fetchUser(),
        fetchAssignments(),
        fetchFacilitatorCentreLinks(),
        fetchEmployeeForFacilitator(),
        fetchFacilitatorsForEmployee(),
      ]);
      setUser(u);
      setAssignments(a.rows || []);
      setFacCentreLinks(fc.rows || []);

      const centreIds: string[] = Array.from(
        new Set(
          (fc.rows ?? [])
            .map((x: any) => String(x.centre?.id ?? x.centreId))
            .filter((id: string): id is string => id !== "")
        )
      );

      let classList: any[] = [];
      if (centreIds.length > 0) {
        classList = await fetchClassroomsByCentres(centreIds);
      }

      setFacClassrooms(classList);

      const facRows = facSide.rows || [];
      if (facRows.length > 0) {
        facRows.sort(
          (x: any, y: any) =>
            new Date(y.startDate).getTime() - new Date(x.startDate).getTime()
        );
        setEmployeeForFacilitator(facRows[0].employee || null);
      } else {
        setEmployeeForFacilitator(null);
      }

      setFacilitatorsForEmployee(
        (empSide.rows || []).map((r: any) => r.facilitator).filter(Boolean)
      );
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
  const isFacilitator = (user?.currentRoles || []).includes("FACILITATOR");
  const isEmployee = (user?.currentRoles || []).includes("RELF_EMPLOYEE");

  // Active centre for facilitator (latest active assignment)
  const activeCentre = useMemo(() => {
    const active = (facCentreLinks || []).find((x: any) => !x.endDate);
    return active?.centre || null;
  }, [facCentreLinks]);

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

  async function assignCentre() {
    if (!pickCentre?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/assignments/facilitator-centre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilitatorId: userId,
          centreId: pickCentre.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setPickCentre(null);
    } catch (e: any) {
      setError(e?.message || "Failed to assign centre");
    } finally {
      setLoading(false);
    }
  }

  async function closeFacilitatorCentre(id: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/admin/assignments/facilitator-centre/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: new Date().toISOString() }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to close centre assignment");
    } finally {
      setLoading(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: "code", label: "Code" },
      { key: "section", label: "Section" },
      { key: "centre", label: "Centre" },
      { key: "timing", label: "Timing" },
      { key: "monthlyAllowance", label: "Allowance" },
      { key: "status", label: "Status" },
    ],
    []
  );

  const renderActions = (row: any) =>
    !row.end ? (
      <Button size="xs" color="light" onClick={() => closeAssignment(row.id)}>
        Close
      </Button>
    ) : null;

  const facCentreColumns = useMemo(
    () => [
      { key: "centre", label: "Centre" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
    ],
    []
  );

  const facCentreRows = useMemo(() => {
    return (facCentreLinks || []).map((x: any) => ({
      id: x.id,
      centreId: x.centre?.id || x.centreId, // preserve for onRowClick
      centre: x.centre ? `${x.centre.code} — ${x.centre.name}` : x.centreId,
      start: x.startDate ? new Date(x.startDate).toLocaleDateString() : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString() : "",
      __raw: x,
    }));
  }, [facCentreLinks]);

  const renderFacCentreActions = (row: any) =>
    !row.end ? (
      <Button
        size="xs"
        color="light"
        onClick={() => closeFacilitatorCentre(row.id)}
      >
        Close
      </Button>
    ) : null;

  const employeeColumns = useMemo(
    () => [
      { key: "name", label: "Employee Name" },
      { key: "email", label: "Employee Email" },
    ],
    []
  );
  const employeeRows = useMemo(() => {
    return employeeForFacilitator
      ? [
          {
            id: employeeForFacilitator.id,
            name: employeeForFacilitator.name ?? "—",
            email: employeeForFacilitator.email,
          },
        ]
      : [];
  }, [employeeForFacilitator]);

  const facilitatorColumns = useMemo(
    () => [
      { key: "name", label: "Facilitator Name" },
      { key: "email", label: "Facilitator Email" },
    ],
    []
  );
  const facilitatorRows = useMemo(() => {
    return (facilitatorsForEmployee || []).map((f: any) => ({
      id: f.id,
      name: f.name ?? "—",
      email: f.email,
    }));
  }, [facilitatorsForEmployee]);

  const classroomRowsFormatted = useMemo(() => {
    return facClassrooms.map((c) => ({
      ...c,
      classroomId: c.id, // preserve for onRowClick
      centre: c.centre ? `${c.centre.code} — ${c.centre.name}` : c.centreId,
      section:
        c.section === "JR" ? (
          <Badge color="pink" className="uppercase">
            JR
          </Badge>
        ) : c.section === "SR" ? (
          <Badge color="purple" className="uppercase">
            SR
          </Badge>
        ) : (
          <Badge color="indigo" className="uppercase">
            JR/SR
          </Badge>
        ),
      timing:
        c.timing === "MORNING" ? (
          <Badge color="success" className="uppercase">
            MORNING
          </Badge>
        ) : (
          <Badge color="warning" className="uppercase">
            EVENING
          </Badge>
        ),
      status: (
        <Badge
          color={c.status === "ACTIVE" ? "success" : "gray"}
          className="uppercase"
        >
          {c.status}
        </Badge>
      ),
      monthlyAllowance: `₹ ${Number(c.monthlyAllowance || 0).toLocaleString(
        "en-IN"
      )}`,
    }));
  }, [facClassrooms]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="xl" color="info" aria-label="Loading user profile" />
          <div className="text-sm text-gray-600">Loading user profile…</div>
        </div>
      </div>
    );
  }

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

      {isFacilitator && activeCentre && (
        <div className="mb-6 p-4 border rounded bg-blue-50">
          <h3 className="font-semibold mb-2">Currently Assigned Centre</h3>
          <div className="space-y-1">
            <div>
              <strong>Code:</strong> {activeCentre.code}
            </div>
            <div>
              <strong>Name:</strong> {activeCentre.name}
            </div>
            <div>
              <strong>Address:</strong> {activeCentre.streetAddress}
            </div>
            <div>
              <strong>City:</strong> {activeCentre.city || "—"}
            </div>
            <div>
              <strong>District:</strong> {activeCentre.district || "—"}
            </div>
            <div>
              <strong>State:</strong> {activeCentre.state}
            </div>
            <div>
              <strong>Pincode:</strong> {activeCentre.pincode}
            </div>
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

      {isFacilitator && (
        <div className="mt-8">
          <h3 className="font-medium mb-2">Assign Centre</h3>
          <div className="flex gap-2 mb-4">
            <div className="w-96">
              <CentreSelect value={pickCentre} onChange={setPickCentre} />
            </div>
            <Button
              onClick={assignCentre}
              disabled={!pickCentre || loading}
              className="ml-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
            >
              Assign
            </Button>
          </div>

          <h4 className="font-medium mb-2">Centre Links</h4>
          <DataTable
            columns={facCentreColumns}
            rows={facCentreRows}
            actions={renderFacCentreActions}
            onRowClick={(row: any) => {
              if (row.centreId) router.push(`/centres/${row.centreId}`);
            }}
            page={1}
            pageSize={facCentreRows.length}
          />

          <div className="mt-6">
            <h4 className="font-medium mb-2">Classrooms in Your Centres</h4>
            <DataTable
              columns={columns}
              rows={classroomRowsFormatted}
              onRowClick={(row: any) => {
                if (row.classroomId)
                  router.push(`/classrooms/${row.classroomId}`);
              }}
              page={1}
              pageSize={classroomRowsFormatted.length}
            />
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-2">Related Employee</h4>
            <DataTable
              columns={employeeColumns}
              rows={employeeRows}
              page={1}
              pageSize={employeeRows.length}
            />
          </div>
        </div>
      )}

      {isEmployee && (
        <div className="mt-8">
          <h3 className="font-medium mb-2">Related Facilitators</h3>
          <DataTable
            columns={facilitatorColumns}
            rows={facilitatorRows}
            page={1}
            pageSize={facilitatorRows.length}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import CentreSelect from "@/components/CrudControls/CentreSelect";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton"; // NEW
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

  // FacilitatorEmployee links (two perspectives)
  const [employeeForFacilitator, setEmployeeForFacilitator] = useState<
    any | null
  >(null);
  const [facilitatorsForEmployee, setFacilitatorsForEmployee] = useState<any[]>(
    [],
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
        userId,
      )}&page=1&pageSize=50`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchFacilitatorCentreLinks() {
    const res = await fetch(
      `/api/admin/assignments/facilitator-centre?facilitatorId=${encodeURIComponent(
        userId,
      )}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { rows: [] };
    return res.json();
  }

  async function fetchEmployeeForFacilitator() {
    const url = new URL(
      "/api/admin/assignments/employee-facilitators",
      window.location.origin,
    );
    url.searchParams.set("facilitatorId", userId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { rows: [] };
    return res.json();
  }

  async function fetchFacilitatorsForEmployee() {
    const url = new URL(
      "/api/admin/assignments/employee-facilitators",
      window.location.origin,
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
    url.searchParams.set("pageSize", "1000");
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
            .filter((id: string): id is string => id !== ""),
        ),
      );

      let classList: any[] = [];
      if (centreIds.length > 0) {
        classList = await fetchClassroomsByCentres(centreIds);
      }
      setFacClassrooms(classList);

      const facRows = (facSide.rows || []) as any[];
      if (facRows.length > 0) {
        facRows.sort(
          (x: any, y: any) =>
            new Date(y.startDate).getTime() - new Date(x.startDate).getTime(),
        );
        setEmployeeForFacilitator(facRows[0].employee || null);
      } else {
        setEmployeeForFacilitator(null);
      }

      setFacilitatorsForEmployee(
        (empSide.rows || []).map((r: any) => r.facilitator).filter(Boolean),
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
      start: x.startDate
        ? new Date(x.startDate).toLocaleDateString("en-GB")
        : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString("en-GB") : "",
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
    } catch (e: any) {
      setError(e?.message || "Failed to close assignment");
    } finally {
      await load();
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
        },
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
    [],
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
    [],
  );

  const facCentreRows = useMemo(() => {
    return (facCentreLinks || []).map((x: any) => ({
      id: x.id,
      centreId: x.centre?.id || x.centreId,
      centre: x.centre ? `${x.centre.code} — ${x.centre.name}` : x.centreId,
      start: x.startDate
        ? new Date(x.startDate).toLocaleDateString("en-GB")
        : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString("en-GB") : "",
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
    [],
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
    [],
  );
  const facilitatorRows = useMemo(() => {
    return (facilitatorsForEmployee || []).map((f: any) => ({
      id: f.id,
      name: f.name ?? "—",
      email: f.email,
    }));
  }, [facilitatorsForEmployee]);

  const classroomRowsFormatted = useMemo(() => {
    return (facClassrooms || []).map((c: any) => ({
      ...c,
      classroomId: c.id,
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
        "en-IN",
      )}`,
      tutor: c.tutorAssignments?.[0]?.user
        ? `${c.tutorAssignments[0].user.name ?? "Unnamed"}`
        : c.tutorAssignments?.[0]?.userId || "",
    }));
  }, [facClassrooms]);

  // Export helpers (export-all only per table)
  async function exportAllTutorAssignmentsForUser(): Promise<
    Record<string, any>[]
  > {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];
    while (true) {
      const res = await fetch(
        `/api/admin/assignments/tutor?userId=${encodeURIComponent(
          userId,
        )}&page=${pageAll}&pageSize=${pageSizeAll}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const rows: any[] = json?.rows || [];
      out.push(
        ...rows.map((x) => ({
          classroom: x.classroom?.code || x.classroomId,
          centre: x.classroom?.centre
            ? `${x.classroom.centre.code} — ${x.classroom.centre.name}`
            : "",
          start: x.startDate
            ? new Date(x.startDate).toLocaleDateString("en-GB")
            : "",
          end: x.endDate ? new Date(x.endDate).toLocaleDateString("en-GB") : "",
          type: x.isSubstitute ? "Substitute" : "Primary",
        })),
      );
      if (rows.length < pageSizeAll) break;
      pageAll += 1;
      if (pageAll > 200) break;
    }
    return out;
  }

  async function exportAllFacilitatorCentreLinks(): Promise<
    Record<string, any>[]
  > {
    const res = await fetch(
      `/api/admin/assignments/facilitator-centre?facilitatorId=${encodeURIComponent(
        userId,
      )}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    const rows: any[] = json?.rows || [];
    return rows.map((x) => ({
      centre: x.centre ? `${x.centre.code} — ${x.centre.name}` : x.centreId,
      start: x.startDate
        ? new Date(x.startDate).toLocaleDateString("en-GB")
        : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString("en-GB") : "",
    }));
  }

  async function exportAllFacilitatorClassrooms(): Promise<
    Record<string, any>[]
  > {
    const centreIds: string[] = Array.from(
      new Set(
        (facCentreLinks ?? [])
          .map((x: any) => String(x.centre?.id ?? x.centreId))
          .filter((id: string): id is string => id !== ""),
      ),
    );
    if (!centreIds.length) return [];

    const url = new URL("/api/admin/classrooms", window.location.origin);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("centreId", centreIds.join(","));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    const rows: any[] = json?.rows || [];
    return rows.map((c) => ({
      code: c.code,
      centre: c.centre ? `${c.centre.code} — ${c.centre.name}` : c.centreId,
      section: c.section,
      timing: c.timing,
      allowance: c.monthlyAllowance,
      status: c.status,
    }));
  }

  async function exportSingleEmployee(): Promise<Record<string, any>[]> {
    if (!employeeForFacilitator) return [];
    return [
      {
        name: employeeForFacilitator.name ?? "—",
        email: employeeForFacilitator.email,
      },
    ];
  }

  async function exportRelatedFacilitators(): Promise<Record<string, any>[]> {
    return (facilitatorsForEmployee || []).map((f: any) => ({
      name: f.name ?? "—",
      email: f.email,
    }));
  }

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

      {/* Tutor assignments */}
      {(user?.currentRoles || []).includes("TUTOR") && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Tutor Assignments</h3>
            <div className="z-100">
              <ExportXlsxButton
                fileName={`user_${user?.email || userId}_tutor_assignments`}
                sheetName="Tutor Assignments"
                columns={[
                  { key: "classroom", label: "Classroom" },
                  { key: "centre", label: "Centre" },
                  { key: "start", label: "Start" },
                  { key: "end", label: "End" },
                  { key: "type", label: "Type" },
                ]}
                visibleRows={[]}
                fetchAll={exportAllTutorAssignmentsForUser}
              />
            </div>
          </div>
          <DataTable
            columns={[
              { key: "classroom", label: "Classroom" },
              { key: "centre", label: "Centre" },
              { key: "start", label: "Start" },
              { key: "end", label: "End" },
              { key: "tag", label: "Type" },
            ]}
            rows={rows}
            actions={(row: any) =>
              !row.end ? (
                <Button
                  size="xs"
                  color="light"
                  onClick={() => closeAssignment(row.id)}
                >
                  Close
                </Button>
              ) : null
            }
            page={1}
            pageSize={rows.length}
          />
        </>
      )}

      {/* Facilitator area */}
      {(user?.currentRoles || []).includes("FACILITATOR") && (
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

          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">Centre Links</h4>
            <div className="z-100">
              <ExportXlsxButton
                fileName={`user_${user?.email || userId}_centre_links`}
                sheetName="Centre Links"
                columns={[
                  { key: "centre", label: "Centre" },
                  { key: "start", label: "Start" },
                  { key: "end", label: "End" },
                ]}
                visibleRows={[]}
                fetchAll={exportAllFacilitatorCentreLinks}
              />
            </div>
          </div>
          <DataTable
            columns={[
              { key: "centre", label: "Centre" },
              { key: "start", label: "Start" },
              { key: "end", label: "End" },
            ]}
            rows={facCentreRows}
            actions={(row: any) =>
              !row.end ? (
                <Button
                  size="xs"
                  color="light"
                  onClick={() => closeFacilitatorCentre(row.id)}
                >
                  Close
                </Button>
              ) : null
            }
            onRowClick={(row: any) => {
              if (row.centreId) router.push(`/centres/${row.centreId}`);
            }}
            page={1}
            pageSize={facCentreRows.length}
          />

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium">Classrooms in Your Centres</h4>
              <div className="z-100">
                <ExportXlsxButton
                  fileName={`user_${user?.email || userId}_fac_classrooms`}
                  sheetName="Classrooms"
                  columns={[
                    { key: "code", label: "Code" },
                    { key: "centre", label: "Centre" },
                    { key: "section", label: "Section" },
                    { key: "timing", label: "Timing" },
                    { key: "allowance", label: "Allowance" },
                    { key: "status", label: "Status" },
                  ]}
                  visibleRows={[]}
                  fetchAll={exportAllFacilitatorClassrooms}
                />
              </div>
            </div>
            <DataTable
              columns={[
                { key: "code", label: "Code" },
                { key: "tutor", label: "Tutor" },
                { key: "section", label: "Section" },
                { key: "timing", label: "Timing" },
                { key: "monthlyAllowance", label: "Allowance" },
                { key: "status", label: "Status" },
              ]}
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
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium">Related Employee</h4>
              <div className="z-100">
                <ExportXlsxButton
                  fileName={`user_${user?.email || userId}_employee`}
                  sheetName="Employee"
                  columns={[
                    { key: "name", label: "Employee Name" },
                    { key: "email", label: "Employee Email" },
                  ]}
                  visibleRows={[]}
                  fetchAll={exportSingleEmployee}
                />
              </div>
            </div>
            <DataTable
              columns={[
                { key: "name", label: "Employee Name" },
                { key: "email", label: "Employee Email" },
              ]}
              rows={employeeRows}
              page={1}
              pageSize={employeeRows.length}
            />
          </div>
        </div>
      )}

      {/* Employee area */}
      {(user?.currentRoles || []).includes("RELF_EMPLOYEE") && (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Related Facilitators</h3>
            <div className="z-100">
              <ExportXlsxButton
                fileName={`user_${user?.email || userId}_related_facilitators`}
                sheetName="Facilitators"
                columns={[
                  { key: "name", label: "Facilitator Name" },
                  { key: "email", label: "Facilitator Email" },
                ]}
                visibleRows={[]}
                fetchAll={exportRelatedFacilitators}
              />
            </div>
          </div>
          <DataTable
            columns={[
              { key: "name", label: "Facilitator Name" },
              { key: "email", label: "Facilitator Email" },
            ]}
            rows={facilitatorRows}
            page={1}
            pageSize={facilitatorRows.length}
          />
        </div>
      )}
    </div>
  );
}

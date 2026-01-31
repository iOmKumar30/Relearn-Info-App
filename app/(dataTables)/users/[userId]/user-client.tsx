"use client";

import CentreSelect from "@/components/CrudControls/CentreSelect";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import DataTable from "@/components/CrudControls/Datatable";
import EditAssignmentModal from "@/components/CrudControls/EditAssignmentModal";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import { Badge, Button, Spinner } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiPencil, HiTrash } from "react-icons/hi";

export default function UserProfileClient({ userId }: { userId: string }) {
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]); 
  const [facCentreLinks, setFacCentreLinks] = useState<any[]>([]); 
  const [facClassrooms, setFacClassrooms] = useState<any[]>([]); 
  const [employeeForFacilitator, setEmployeeForFacilitator] = useState<
    any | null
  >(null);
  const [facilitatorsForEmployee, setFacilitatorsForEmployee] = useState<any[]>(
    [],
  );

  const [pick, setPick] = useState<{ id: string; label: string } | null>(null); // For assigning classroom to tutor
  const [pickCentre, setPickCentre] = useState<{
    id: string;
    label: string;
  } | null>(null); // For assigning centre to facilitator

  // Edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(
    null,
  );


  async function fetchUser() {
    const res = await fetch(`/api/admin/users/${userId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchAssignments() {
    const res = await fetch(
      `/api/admin/assignments/tutor?userId=${encodeURIComponent(userId)}&page=1&pageSize=50`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchFacilitatorCentreLinks() {
    const res = await fetch(
      `/api/admin/assignments/facilitator-centre?facilitatorId=${encodeURIComponent(userId)}`,
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

  const load = async (silent = false) => {
    try {
      if (!silent) setInitialLoading(true);
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

      // Get classrooms for facilitator based on assigned centres
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

      // Process Employee <-> Facilitator links
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
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);



  // Assign a new classroom to tutor
  async function handleAssignTutor() {
    if (!pick?.id) return;
    const toastId = toast.loading("Assigning classroom...");
    try {
      setProcessing(true);
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
      await load(true);
      setPick(null);
      toast.success("Classroom assigned successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign classroom", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  // Close an active tutor assignment
  async function closeAssignment(id: string) {
    const toastId = toast.loading("Closing assignment...");
    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/assignments/tutor/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      toast.success("Assignment closed successfully", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to close assignment", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  // Update Dates (Start/End) via Edit Modal
  async function handleUpdateDates(
    startDate: Date | null,
    endDate: Date | null,
  ) {
    if (!editingAssignment) return;
    const toastId = toast.loading("Updating assignment...");
    try {
      setProcessing(true);
      const payload: any = {};

      if (startDate) payload.startDate = startDate.toISOString();
      // Explicitly send null if endDate is null to clear it (make active), or the date string
      payload.endDate = endDate ? endDate.toISOString() : null;

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
      toast.success("Assignment updated", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update assignment", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  // Delete Assignment (for closed ones)
  async function performDeleteAssignment() {
    if (!assignmentToDelete) return;
    const toastId = toast.loading("Deleting assignment history...");
    try {
      setProcessing(true);
      const res = await fetch(
        `/api/admin/assignments/tutor/${assignmentToDelete}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
      toast.success("Assignment deleted", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete assignment", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  // Open Edit Modal Helper
  const openEditModal = (row: any) => {
    setEditingAssignment(row);
    setEditModalOpen(true);
  };

  // Open Delete Modal Helper
  const confirmDeleteAssignment = (id: string) => {
    setAssignmentToDelete(id);
    setDeleteModalOpen(true);
  };

  // Assign Centre to Facilitator
  async function assignCentre() {
    if (!pickCentre?.id) return;
    const toastId = toast.loading("Assigning centre...");
    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/assignments/facilitator-centre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilitatorId: userId,
          centreId: pickCentre.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      setPickCentre(null);
      toast.success("Centre assigned", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign centre", { id: toastId });
    } finally {
      setProcessing(false);
    }
  }

  // Close Centre Assignment
  async function closeFacilitatorCentre(id: string) {
    const toastId = toast.loading("Closing centre assignment...");
    try {
      setProcessing(true);
      const res = await fetch(
        `/api/admin/assignments/facilitator-centre/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: new Date().toISOString() }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      await load(true);
      toast.success("Centre assignment closed", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to close centre assignment", {
        id: toastId,
      });
    } finally {
      setProcessing(false);
    }
  }

  // Tutor Rows
  const tutorRows = useMemo(() => {
    return assignments.map((x) => ({
      id: x.id,
      classroom: x.classroom?.code || x.classroomId,
      section: x.classroom?.section || "—",
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

  const tutorActions = (row: any) => (
    <div className="flex gap-2">
      <Button
        size="xs"
        color="gray"
        onClick={() => openEditModal(row)}
        title="Edit Dates"
      >
        <HiPencil className="h-4 w-4" />
      </Button>

      {!row.end && (
        <Button
          size="xs"
          color="warning"
          onClick={() => closeAssignment(row.id)}
        >
          Close
        </Button>
      )}

      {row.end && (
        <Button
          size="xs"
          color="failure"
          onClick={() => confirmDeleteAssignment(row.id)}
          title="Delete History"
        >
          <HiTrash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // Facilitator Centre Rows
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

  // Classroom Rows
  const classroomRowsFormatted = useMemo(() => {
    return (facClassrooms || []).map((c: any) => ({
      ...c,
      classroomId: c.id,
      centre: c.centre ? `${c.centre.code} — ${c.centre.name}` : c.centreId,
      section:
        c.section === "JR" ? (
          <Badge color="pink" className="uppercase inline-block">
            JR
          </Badge>
        ) : c.section === "SR" ? (
          <Badge color="purple" className="uppercase inline-block">
            SR
          </Badge>
        ) : (
          <Badge color="indigo" className="uppercase inline-block">
            JR/SR
          </Badge>
        ),
      timing:
        c.timing === "MORNING" ? (
          <Badge color="success" className="uppercase inline-block">
            MORNING
          </Badge>
        ) : (
          <Badge color="warning" className="uppercase inline-block">
            EVENING
          </Badge>
        ),
      status: (
        <Badge
          color={c.status === "ACTIVE" ? "success" : "gray"}
          className="uppercase inline-block"
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

  // Employee Rows
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

  // Facilitator Rows
  const facilitatorRows = useMemo(() => {
    return (facilitatorsForEmployee || []).map((f: any) => ({
      id: f.id,
      name: f.name ?? "—",
      email: f.email,
    }));
  }, [facilitatorsForEmployee]);

  async function exportAllTutorAssignmentsForUser(): Promise<
    Record<string, any>[]
  > {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];
    while (true) {
      const res = await fetch(
        `/api/admin/assignments/tutor?userId=${encodeURIComponent(userId)}&page=${pageAll}&pageSize=${pageSizeAll}`,
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
      `/api/admin/assignments/facilitator-centre?facilitatorId=${encodeURIComponent(userId)}`,
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


  if (initialLoading) {
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
              <Badge
                key={r}
                color="info"
                className="mr-1 uppercase inline-block"
              >
                {r}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* --- TUTOR SECTION --- */}
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
                  { key: "section", label: "Section" },
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
              { key: "section", label: "Section" },
              { key: "centre", label: "Centre" },
              { key: "start", label: "Start" },
              { key: "end", label: "End" },
              { key: "tag", label: "Type" },
            ]}
            rows={tutorRows}
            actions={tutorActions}
            page={1}
            pageSize={tutorRows.length}
          />
        </>
      )}

      {/* --- FACILITATOR SECTION --- */}
      {(user?.currentRoles || []).includes("FACILITATOR") && (
        <div className="mt-8">
          <h3 className="font-medium mb-2">Assign Centre</h3>
          <div className="flex gap-2 mb-4">
            <div className="w-96">
              <CentreSelect value={pickCentre} onChange={setPickCentre} />
            </div>
            <Button
              onClick={assignCentre}
              disabled={!pickCentre || processing}
              className="ml-4 inline-flex items-center"
              color="blue"
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

      {/* --- EMPLOYEE SECTION --- */}
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


      <EditAssignmentModal
        open={editModalOpen}
        assignment={editingAssignment}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateDates}
      />

      <ConfirmDeleteModal
        open={deleteModalOpen}
        title="Delete Assignment History"
        message="Are you sure you want to delete this assignment record? This cannot be undone."
        confirmLabel="Delete"
        processing={processing}
        onCancel={() => {
          setDeleteModalOpen(false);
          setAssignmentToDelete(null);
        }}
        onConfirm={performDeleteAssignment}
      />
    </div>
  );
}

"use client";

import DataTable from "@/components/CrudControls/Datatable";
import UserSelect from "@/components/CrudControls/UserSelect";
import { Badge, Button } from "flowbite-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";
type Centre = {
  id: string;
  code: string;
  name: string;
  streetAddress: string;
  city?: string | null;
  district?: string | null;
  state: string;
  pincode: string;
  status: "ACTIVE" | "INACTIVE";
  dateAssociated: string;
  dateLeft: string | null;
};

export default function CentreClient({ centreId }: { centreId: string }) {
  const [loading, setLoading] = useState(true); // start true so nothing flashes before data
  const [error, setError] = useState<string | null>(null);

  const [centre, setCentre] = useState<Centre | null>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [facHistory, setFacHistory] = useState<any[]>([]);

  // facilitator assignments states
  const [showAddFac, setShowAddFac] = useState(false);
  const [selectedFac, setSelectedFac] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const fetchCentre = useCallback(async () => {
    const res = await fetch(`/api/admin/centres/${centreId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Failed to load centre");
    }
    return await res.json();
  }, [centreId]);

  const fetchClassrooms = useCallback(async () => {
    const url = new URL("/api/admin/classrooms", window.location.origin);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("centreId", centreId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Failed to load classrooms");
    }

    return await res.json();
  }, [centreId]);

  const fetchFacilitatorHistory = useCallback(async () => {
    const url = new URL(
      "/api/admin/assignments/facilitator-centre",
      window.location.origin
    );
    url.searchParams.set("centreId", centreId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { rows: [] };
    return await res.json();
  }, [centreId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      fetchCentre(),
      fetchClassrooms(),
      fetchFacilitatorHistory(),
    ]);

    const [centreRes, classRes, facRes] = results;

    if (centreRes.status === "fulfilled") setCentre(centreRes.value);
    if (classRes.status === "fulfilled")
      setClassrooms(classRes.value.rows || []);
    if (facRes.status === "fulfilled") setFacHistory(facRes.value.rows || []);

    if (centreRes.status === "rejected") {
      setError(centreRes.reason?.message || "Failed to load centre");
    }
    if (classRes.status === "rejected") {
      setError(classRes.reason?.message || "Failed to load classrooms");
    }
    if (facRes.status === "rejected") {
      setError(facRes.reason?.message || "Failed to load facilitator history");
    }

    setLoading(false);
  }, [fetchCentre, fetchClassrooms, fetchFacilitatorHistory]);

  useEffect(() => {
    load();
  }, [load]);

  // Columns
  const classroomColumns = useMemo(
    () => [
      { key: "code", label: "Classroom Code" },
      { key: "section", label: "Section" },
      { key: "timing", label: "Timing" },
      { key: "monthlyAllowance", label: "Monthly Allowance" },
      { key: "status", label: "Status" },
      { key: "dateCreated", label: "Date Created" },
      { key: "dateClosed", label: "Date Closed" },
    ],
    []
  );

  const classroomRows = useMemo(() => {
    return (classrooms || []).map((r: any) => ({
      ...r,
      section:
        r.section === "JR" ? (
          <Badge color="pink" className="uppercase">
            JR
          </Badge>
        ) : (
          <Badge color="purple" className="uppercase">
            SR
          </Badge>
        ),
      timing:
        r.timing === "MORNING" ? (
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
          color={r.status === "ACTIVE" ? "success" : "gray"}
          className="uppercase"
        >
          {r.status}
        </Badge>
      ),
      dateCreated: r.dateCreated
        ? new Date(r.dateCreated).toLocaleDateString()
        : "",
      dateClosed: r.dateClosed
        ? new Date(r.dateClosed).toLocaleDateString()
        : "",
      monthlyAllowance: `₹ ${Number(r.monthlyAllowance || 0).toLocaleString(
        "en-IN"
      )}`,
    }));
  }, [classrooms]);

  const facColumns = useMemo(
    () => [
      { key: "facilitator", label: "Facilitator" },
      { key: "start", label: "Start" },
      { key: "end", label: "End" },
    ],
    []
  );

  const facRows = useMemo(() => {
    return (facHistory || []).map((x: any) => ({
      id: x.id,
      facilitator: x.user
        ? `${x.user.name ?? "Unnamed"} — ${x.user.email}`
        : x.userId,
      start: x.startDate ? new Date(x.startDate).toLocaleDateString() : "",
      end: x.endDate ? new Date(x.endDate).toLocaleDateString() : "",
      __raw: x,
    }));
  }, [facHistory]);

  async function closeFacilitatorLink(id: string) {
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
      setError(e?.message || "Failed to close facilitator link");
    } finally {
      setLoading(false);
    }
  }
  async function deleteFacilitatorLink(id: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/admin/assignments/facilitator-centre/${id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete the Facilitator Link");
    } finally {
      setLoading(false);
    }
  }
  const hasActiveFacilitator = (facHistory || []).some((x: any) => !x.endDate);
  const renderFacActions = (row: any) =>
    !row.end ? (
      <Button
        size="xs"
        color="light"
        onClick={() => closeFacilitatorLink(row.id)}
      >
        Close
      </Button>
    ) : (
      <Button
        size="xs"
        color="red"
        onClick={() => deleteFacilitatorLink(row.id)}
      >
        Delete
      </Button>
    );
  // Central full-page loader while fetching, to avoid any partial rendering
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <ClipLoader size={40} />
          <div className="text-sm text-gray-600">Loading centre data…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-3">Centre Profile</h2>

      {error && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-red-700">
          {error}
        </div>
      )}

      {centre && (
        <div className="mb-6 space-y-1">
          <div>Code: {centre.code}</div>
          <div>Name: {centre.name}</div>
          <div>Address: {centre.streetAddress}</div>
          <div>
            Location: {centre.city ? `${centre.city}, ` : ""}
            {centre.district ? `${centre.district}, ` : ""}
            {centre.state} — {centre.pincode}
          </div>
          <div>
            Status:{" "}
            <Badge
              color={centre.status === "ACTIVE" ? "success" : "gray"}
              className="uppercase w-[80px] text-center"
            >
              {centre.status}
            </Badge>
          </div>
          <div>
            Associated:{" "}
            {centre.dateAssociated
              ? new Date(centre.dateAssociated).toLocaleDateString()
              : "—"}
          </div>
          <div>
            Left:{" "}
            {centre.dateLeft
              ? new Date(centre.dateLeft).toLocaleDateString()
              : "—"}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-medium mb-2">Classrooms</h3>
        <DataTable columns={classroomColumns} rows={classroomRows} />
      </div>
      {!hasActiveFacilitator && (
        <div className="mt-3">
          <Button size="lg" color="light" onClick={() => setShowAddFac(true)}>
            Add Facilitator
          </Button>
          {showAddFac && (
            <div className="my-4 border p-4 rounded bg-gray-50 max-w-sm">
              <UserSelect
                role="FACILITATOR"
                value={selectedFac}
                onChange={setSelectedFac}
                placeholder="Search facilitators…"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button
                  color="light"
                  disabled={!selectedFac || assigning}
                  onClick={async () => {
                    if (!selectedFac?.id) return;
                    setAssigning(true);
                    try {
                      const res = await fetch(
                        "/api/admin/assignments/facilitator-centre",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            facilitatorId: selectedFac.id,
                            centreId,
                          }),
                        }
                      );
                      if (!res.ok) throw new Error(await res.text());
                      setShowAddFac(false);
                      setSelectedFac(null);
                      await load();
                    } catch (err: any) {
                      alert(err.message || "Failed to assign facilitator");
                    } finally {
                      setAssigning(false);
                    }
                  }}
                >
                  Assign
                </Button>
                <Button color="light" onClick={() => setShowAddFac(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <h3 className="font-medium mb-2">Facilitator History</h3>
        <DataTable
          columns={facColumns}
          rows={facRows}
          actions={renderFacActions}
        />
      </div>
    </div>
  );
}

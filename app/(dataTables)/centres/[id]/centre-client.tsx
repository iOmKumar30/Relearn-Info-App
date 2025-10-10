"use client";

import DataTable from "@/components/CrudControls/Datatable";
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

  const fetchCentre = useCallback(async () => {
    const res = await fetch(`/api/admin/centres/${centreId}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [centreId]);

  const fetchClassrooms = useCallback(async () => {
    const url = new URL("/api/admin/classrooms", window.location.origin);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("centreId", centreId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // { total, rows }
  }, [centreId]);

  const fetchFacilitatorHistory = useCallback(async () => {
    const url = new URL(
      "/api/admin/assignments/facilitator-centre",
      window.location.origin
    );
    url.searchParams.set("centreId", centreId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return { rows: [] }; // non-admin or no links
    return res.json(); // { rows }
  }, [centreId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, cls, fac] = await Promise.all([
        fetchCentre(),
        fetchClassrooms(),
        fetchFacilitatorHistory(),
      ]);
      setCentre(c);
      setClassrooms(cls.rows || []);
      setFacHistory(fac.rows || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load centre");
    } finally {
      setLoading(false);
    }
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

  const renderFacActions = (row: any) =>
    !row.end ? (
      <Button
        size="xs"
        color="light"
        onClick={() => closeFacilitatorLink(row.id)}
      >
        Close
      </Button>
    ) : null;

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

      <div className="mt-8">
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

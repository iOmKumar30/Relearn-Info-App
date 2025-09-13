"use client";

import RoleAssignModal from "@/components/CreateModals/RoleAssignModal";
import DataTable from "@/components/CrudControls/Datatable";
import { Badge, Button } from "flowbite-react";
import { useEffect, useMemo, useState } from "react";
import { usePendingUsers } from "./usePendingUsers";
import { ClipLoader } from "react-spinners";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "onboardingStatus", label: "Status" },
  { key: "requestedAt", label: "Requested At" },
  { key: "currentRoles", label: "Current Roles" },
];

export default function PendingUsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, loading, error, refetch } = usePendingUsers({
    q,
    page,
    pageSize,
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const rows = useMemo(() => {
    return (data?.rows ?? []).map((u: any) => ({
      ...u,
      onboardingStatus: (
        <Badge color="warning" className="uppercase">
          {String(u.onboardingStatus)}
        </Badge>
      ),
      requestedAt: new Date(u.requestedAt).toLocaleString(),
      currentRoles: (
        <>
          {(u.currentRoles || []).map((r: string) => (
            <Badge key={r} color="info" className="mr-1 uppercase">
              {r}
            </Badge>
          ))}
        </>
      ),
    }));
  }, [data]);

  const actions = (row: any) => (
    <div className="flex gap-2">
      <Button
        size="xs"
        color="blue"
        onClick={() => {
          setSelected(row);
          setAssignOpen(true);
        }}
      >
        Assign roles
      </Button>
    </div>
  );

  useEffect(() => {
    // refetch on basic search debounce can be added later
  }, [q, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Pending Users</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name/email/phone..."
            className="rounded border border-gray-300 px-3 py-2"
          />
          <Button color="light" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <ClipLoader size={40} />
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} actions={actions} />
      )}

      {/* Simple pager */}
      <div className="flex items-center justify-end gap-2">
        <Button
          size="xs"
          color="light"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </Button>
        <span className="text-sm text-gray-600">
          Page {page} / {Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))}
        </span>
        <Button
          size="xs"
          color="light"
          disabled={page >= Math.ceil((data?.total ?? 0) / pageSize)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <RoleAssignModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setSelected(null);
        }}
        user={selected}
        onAssigned={() => {
          setAssignOpen(false);
          setSelected(null);
          refetch();
        }}
      />
    </div>
  );
}

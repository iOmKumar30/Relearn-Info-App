"use client";

import DataTable from "@/components/CrudControls/Datatable";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Pagination } from "flowbite-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// Table columns – kept simple and consistent
const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "roles", label: "Current Roles" },
  { key: "onboardingStatus", label: "Onboarding" },
];

type Row = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  onboardingStatus: string;
  createdAt: string;
  currentRoles: string[];
};

/* const filters = [
  // Reserved for future facets; kept to maintain toolbar consistency
]; */
export default function FacilitatorsPage() {
  const role = "FACILITATOR"; // backend expects RoleName enum string
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);

  // Build URL for role-based listing (single role, plus q/page/pageSize)
  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/users/by-role", window.location.origin);
    url.searchParams.set("role", role);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (search) url.searchParams.set("q", search); // backend currently ignores q if not implemented; harmless
    return url.toString();
  }, [role, page, pageSize, search]);
  [1];

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      setError(e?.message || "Failed to load facilitators");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);
  [1];

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);
  [1];

  // Render-friendly mapping: role badges and onboarding chip
  const rows = useMemo(() => {
    return (data?.rows ?? []).map((u) => ({
      ...u,
      roles: (
        <>
          {(u.currentRoles || []).map((r) => (
            <Badge key={r} color="info" className="mr-1 uppercase">
              {r}
            </Badge>
          ))}
        </>
      ),
      onboardingStatus: (
        <Badge color="indigo" className="uppercase">
          {u.onboardingStatus}
        </Badge>
      ),
    }));
  }, [data]);
  [3];

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  [2];

  return (
    <RBACGate roles={["ADMIN"]}>
      <h2 className="text-2xl font-semibold mb-4">Facilitators</h2>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search facilitators..."
        />
        {/*
                  <div className="flex-1 flex justify-end">
                      No create/edit/delete actions on this page 
                      <FilterDropdown
                          filters={filters}
                          onFilterChange={() => {
                              
                          }}
                      />
                  </div>
              */}
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="rounded border border-gray-200 bg-white p-6">
          Loading...
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} /* no actions */ />
      )}

      <div className="mt-3 flex overflow-x-auto sm:justify-end">
        <Pagination
          currentPage={page}
          onPageChange={(p: number) => setPage(p)}
          totalPages={totalPages}
          showIcons
        />
      </div>
    </RBACGate>
  );
}

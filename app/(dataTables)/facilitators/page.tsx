"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton"; 
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { Badge, Pagination } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

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

export default function FacilitatorsPage() {
  const role = "FACILITATOR"; // backend RoleName
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);
  const debouncedSearch = useDebounce(search, 800);

  // Build URL for role listing
  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/users/by-role", window.location.origin);
    url.searchParams.set("role", role);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    return url.toString();
  }, [role, page, pageSize, debouncedSearch]);

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

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Raw rows for export
  const rawRows = useMemo(() => data?.rows ?? [], [data]);

  // Helper for export-all: same endpoint, larger paging
  const buildListUrl = useCallback(
    (pageParam: number, pageSizeParam: number) => {
      const url = new URL("/api/admin/users/by-role", window.location.origin);
      url.searchParams.set("role", role);
      url.searchParams.set("page", String(pageParam));
      url.searchParams.set("pageSize", String(pageSizeParam));
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      return url;
    },
    [role, debouncedSearch]
  );

  async function fetchAllFacilitators(): Promise<Record<string, any>[]> {
    const pageSizeAll = 1000;
    let pageAll = 1;
    const out: Record<string, any>[] = [];

    while (true) {
      const url = buildListUrl(pageAll, pageSizeAll);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const rows: Row[] = json?.rows || [];

      out.push(
        ...rows.map((u) => ({
          name: u.name || "",
          email: u.email,
          phone: u.phone || "",
          roles: (u.currentRoles || []).join(", "),
          onboardingStatus: u.onboardingStatus,
          createdAt: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("en-GB")
            : "",
          address: u.address || "",
        }))
      );

      if (rows.length < pageSizeAll) break;
      pageAll += 1;
      if (pageAll > 200) break; // safety
    }

    return out;
  }

  // Visible rows formatted for export (no JSX)
  const formattedVisibleForExport = useMemo(() => {
    return rawRows.map((u) => ({
      name: u.name || "",
      email: u.email,
      phone: u.phone || "",
      roles: (u.currentRoles || []).join(", "),
      onboardingStatus: u.onboardingStatus,
      createdAt: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-GB")
        : "",
      address: u.address || "",
    }));
  }, [rawRows]);

  // Render-friendly mapping
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

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const router = useRouter();

  return (
    <RBACGate roles={["ADMIN", "RELF_EMPLOYEE"]}>
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
        <div className="flex-1 flex justify-end z-100">
          <ExportXlsxButton
            fileName="facilitators"
            sheetName="Facilitators"
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "roles", label: "Current Roles" },
              { key: "onboardingStatus", label: "Onboarding" },
              { key: "createdAt", label: "Created" },
              { key: "address", label: "Address" },
            ]}
            visibleRows={formattedVisibleForExport}
            fetchAll={fetchAllFacilitators}
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center items-center h-screen">
          <ClipLoader size={40} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(row: any) => router.push(`/users/${row.id}`)}
          page={page}
          pageSize={pageSize}
        />
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

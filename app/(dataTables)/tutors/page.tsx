"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton"; // NEW
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { userProfileHref } from "@/libs/breadcrumbs";
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
  { key: "status", label: "Status" },
];

type Row = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  createdAt: string;
  currentRoles: string[];
};

export default function TutorsPage() {
  const role = "TUTOR";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);

  const debouncedSearch = useDebounce(search, 800); // debounce search input

  const buildUrl = useCallback(() => {
    const url = new URL("/api/admin/users/by-role", window.location.origin);
    url.searchParams.set("role", role);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
    return url.toString();
  }, [role, page, pageSize, debouncedSearch]);

  // Fetch data
  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({ total: json.total, rows: json.rows });
    } catch (e: any) {
      setError(e?.message || "Failed to load tutors");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows, page, debouncedSearch]);

  // Raw rows for export (no JSX)
  const rawRows = useMemo(() => data?.rows ?? [], [data]);

  // Helper to build same URL with custom page/pageSize (for export-all)
  const buildListUrl = useCallback(
    (pageParam: number, pageSizeParam: number) => {
      const url = new URL("/api/admin/users/by-role", window.location.origin);
      url.searchParams.set("role", role);
      url.searchParams.set("page", String(pageParam));
      url.searchParams.set("pageSize", String(pageSizeParam));
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      return url;
    },
    [role, debouncedSearch],
  );

  // Export: fetch all pages with current search
  async function fetchAllTutors(): Promise<Record<string, any>[]> {
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
          status: u.status,
          createdAt: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("en-GB")
            : "",
          address: u.address || "",
        })),
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
      status: u.status,
      createdAt: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-GB")
        : "",
      address: u.address || "",
    }));
  }, [rawRows]);

  // Data for visible table (with JSX)
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
      status: (
        <Badge color="indigo" className="uppercase">
          {u.status}
        </Badge>
      ),
    }));
  }, [data]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const router = useRouter();

  return (
    <RBACGate roles={["ADMIN"]}>
      <h2 className="text-2xl font-semibold mb-4">Tutors</h2>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search tutors..."
        />
        <div className="z-100 flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:justify-end">
          <ExportXlsxButton
            fileName="tutors"
            sheetName="Tutors"
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "roles", label: "Current Roles" },
              { key: "status", label: "Status" },
              { key: "createdAt", label: "Created" },
              { key: "address", label: "Address" },
            ]}
            visibleRows={formattedVisibleForExport}
            fetchAll={fetchAllTutors}
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
          onRowClick={(row: any) => router.push(userProfileHref(row.id, "tutors"))}
          page={page}
          pageSize={pageSize}
        />
      )}

      <div className="mt-3 flex overflow-x-auto pb-1 sm:justify-end">
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

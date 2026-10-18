"use client";

import { useDebounce } from "@/app/hooks/useDebounce";
import DataTable from "@/components/CrudControls/Datatable";
import ExportXlsxButton from "@/components/CrudControls/ExportXlsxButton";
import SearchBar from "@/components/CrudControls/SearchBar";
import RBACGate from "@/components/RBACGate";
import { userProfileHref } from "@/libs/breadcrumbs";
import { displayRoleName } from "@/libs/roles";
import { Badge, Pagination } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "roles", label: "Roles" },
  { key: "status", label: "Status" },
];

const exportColumns = [
  ...columns,
  { key: "createdAt", label: "Created" },
  { key: "address", label: "Address" },
];

type Row = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  currentRoles: string[];
};

function formatExportRow(user: Row) {
  return {
    name: user.name || "",
    email: user.email,
    phone: user.phone || "",
    roles: [...new Set(user.currentRoles)].map(displayRoleName).join(", "),
    status: user.status,
    createdAt: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-GB")
      : "",
    address: user.address || "",
  };
}

// The API caps pages at 100; fetch each page to avoid partial exports.
async function fetchAllMasterTutors(
  fetchPage: (page: number, pageSize: number) => Promise<Row[]>,
): Promise<Row[]> {
  const result: Row[] = [];
  const pageSize = 100;
  for (let page = 1; page <= 10000; page += 1) {
    const rows = await fetchPage(page, pageSize);
    result.push(...rows);
    if (rows.length < pageSize) return result;
  }
  throw new Error("Directory export exceeded the page limit");
}

function MasterTutorsContent() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; rows: Row[] } | null>(null);
  const pageSize = 20;
  const query = useDebounce(search, 800);
  const router = useRouter();

  const buildUrl = useCallback((pageNumber: number, size: number) => {
    const url = new URL("/api/admin/users/by-role", window.location.origin);
    url.searchParams.set("role", "MASTER_TUTOR");
    url.searchParams.set("page", String(pageNumber));
    url.searchParams.set("pageSize", String(size));
    if (query.trim()) url.searchParams.set("q", query.trim());
    return url.toString();
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(buildUrl(page, pageSize), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load directory");
        const result = await response.json();
        if (!controller.signal.aborted) {
          setData({ total: result.total, rows: result.rows });
        }
      } catch {
        if (!controller.signal.aborted) {
          setData(null);
          setError("Unable to load master tutors. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [buildUrl, page]);

  const rawRows = useMemo(() => data?.rows ?? [], [data]);
  const rows = useMemo(
    () => rawRows.map((user) => ({
      ...user,
      roles: (
        <>
          {[...new Set(user.currentRoles)].map((roleName) => (
            <Badge key={roleName} color="info" className="mr-1 uppercase">
              {displayRoleName(roleName)}
            </Badge>
          ))}
        </>
      ),
      status: (
        <Badge color="indigo" className="uppercase">{user.status}</Badge>
      ),
    })),
    [rawRows],
  );

  const fetchAll = useCallback(async () => {
    try {
      const allRows = await fetchAllMasterTutors(async (pageNumber, size) => {
        const response = await fetch(buildUrl(pageNumber, size), {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to export directory");
        const result = await response.json();
        return result.rows as Row[];
      });
      return allRows.map(formatExportRow);
    } catch (err) {
      setError("Unable to export master tutors. Please try again.");
      throw err;
    }
  }, [buildUrl]);

  return (
    <>
      <h2 className="mb-4 text-2xl font-semibold">Master Tutors</h2>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setPage(1); }}
          placeholder="Search master tutors..."
        />
        <div className="z-100 flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:justify-end">
          <ExportXlsxButton
            fileName="master-tutors"
            sheetName="Master Tutors"
            columns={exportColumns}
            visibleRows={rawRows.map(formatExportRow)}
            fetchAll={fetchAll}
          />
        </div>
      </div>
      {error && (
        <div role="alert" className="mb-3 rounded border border-red-400 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex h-64 items-center justify-center" aria-label="Loading directory">
          <ClipLoader size={40} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(row) => router.push(userProfileHref(row.id, "master-tutors"))}
          page={page}
          pageSize={pageSize}
        />
      )}
      <div className="mt-3 flex overflow-x-auto pb-1 sm:justify-end">
        <Pagination
          currentPage={page}
          onPageChange={setPage}
          totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))}
          showIcons
        />
      </div>
    </>
  );
}

export default function MasterTutorsPage() {
  return <RBACGate roles={["ADMIN"]}><MasterTutorsContent /></RBACGate>;
}

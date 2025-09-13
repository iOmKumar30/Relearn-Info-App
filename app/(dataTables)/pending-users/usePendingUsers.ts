"use client";

import { useCallback, useEffect, useState } from "react";

type PendingResult = {
  page: number;
  pageSize: number;
  total: number;
  rows: Array<{
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    onboardingStatus: string;
    requestedAt: string;
    currentRoles: string[];
  }>;
};

export function usePendingUsers(params: {
  q: string;
  page: number;
  pageSize: number;
}) {
  const { q, page, pageSize } = params;
  const [data, setData] = useState<PendingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL("/api/admin/users/pending", window.location.origin);
      if (q) url.searchParams.set("q", q);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as PendingResult;
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load pending users");
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

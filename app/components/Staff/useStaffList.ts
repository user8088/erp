"use client";

import { useEffect, useState, useCallback } from "react";
import { staffApi } from "../../lib/apiClient";
import type { StaffMember, Paginated } from "../../lib/types";

export function useStaffList() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffApi.list({ page, per_page: perPage });
      setStaff(res.data ?? (res as unknown as Paginated<StaffMember>).data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e) {
      console.error(e);
      setError(
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to load staff."
      );
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    staff,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
    reload: load,
  };
}


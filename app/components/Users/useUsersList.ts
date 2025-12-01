"use client";

import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import type { User, Paginated } from "../../lib/types";

// Simple in-memory cache scoped to this module for the lifetime of the page.
// Key: `${page}-${perPage}`
const usersCache = new Map<string, { users: User[]; total: number }>();

export function useUsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}`;

    const load = async () => {
      // Serve from cache if we already fetched this page during this session
      if (usersCache.has(key)) {
        const cached = usersCache.get(key)!;
        setUsers(cached.users);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<Paginated<User>>(
          `/users?page=${page}&per_page=${perPage}`
        );
        if (!cancelled) {
          setUsers(data.data);
          setTotal(data.meta.total);
          usersCache.set(key, { users: data.data, total: data.meta.total });
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load users.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, perPage]);

  return {
    users,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
  };
}



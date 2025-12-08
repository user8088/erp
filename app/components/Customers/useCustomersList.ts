"use client";

import { useEffect, useState } from "react";
import { customersApi, type GetCustomersParams } from "../../lib/apiClient";
import type { Customer } from "../../lib/types";

// Simple in-memory cache scoped to this module for the lifetime of the page.
const customersCache = new Map<string, { customers: Customer[]; total: number }>();

export function invalidateCustomersCache() {
  customersCache.clear();
}

export function useCustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetCustomersParams>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateCustomersCache();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      // Serve from cache if we already fetched this page during this session
      if (customersCache.has(key)) {
        const cached = customersCache.get(key)!;
        setCustomers(cached.customers);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await customersApi.getCustomers({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setCustomers(data.data);
          setTotal(data.meta.total);
          customersCache.set(key, { customers: data.data, total: data.meta.total });
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to load customers.";
          setError(errorMessage);
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
  }, [page, perPage, filters, refreshTrigger]);

  return {
    customers,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
    filters,
    setFilters,
    refresh,
  };
}

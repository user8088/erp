"use client";

import { useState, useEffect, useCallback } from "react";
import { suppliersApi, type GetSuppliersParams } from "../../lib/apiClient";
import type { Supplier } from "../../lib/types";

export interface SuppliersFilters {
  search: string;
  status?: "active" | "inactive";
  rating_filter?: string;
}

// Simple client-side cache
let suppliersCache: {
  data: Supplier[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
  params: string;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5000; // 5 seconds

export function invalidateSuppliersCache() {
  suppliersCache = null;
}

export function useSuppliersList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SuppliersFilters>({
    search: "",
    status: undefined,
    rating_filter: undefined,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateSuppliersCache();
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: GetSuppliersParams = {
      page,
      per_page: perPage,
      search: filters.search || undefined,
      status: filters.status || undefined,
      rating_filter: filters.rating_filter || undefined,
    };

    const paramsKey = JSON.stringify(params);

    // Check cache
    if (
      suppliersCache &&
      suppliersCache.params === paramsKey &&
      Date.now() - suppliersCache.timestamp < CACHE_DURATION
    ) {
      setSuppliers(suppliersCache.data);
      setTotal(suppliersCache.meta.total);
      setLoading(false);
      return;
    }

    try {
      const result = await suppliersApi.getSuppliers(params);
      setSuppliers(result.data);
      setTotal(result.meta.total);

      // Update cache
      suppliersCache = {
        data: result.data,
        meta: result.meta,
        params: paramsKey,
        timestamp: Date.now(),
      };
    } catch (err) {
      setError("Failed to load suppliers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filters, refreshTrigger]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return {
    suppliers,
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
    refetch: fetchSuppliers,
  };
}

"use client";

import { useEffect, useState } from "react";
import { rentalApi, type GetRentalCategoriesParams } from "../../../lib/apiClient";
import type { RentalCategory } from "../../../lib/types";

const rentalCategoriesCache = new Map<string, { categories: RentalCategory[]; total: number }>();

export function invalidateRentalCategoriesCache() {
  rentalCategoriesCache.clear();
}

export function useRentalCategoriesList() {
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetRentalCategoriesParams>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateRentalCategoriesCache();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      if (rentalCategoriesCache.has(key)) {
        const cached = rentalCategoriesCache.get(key)!;
        setCategories(cached.categories);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await rentalApi.getCategories({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setCategories(data.data);
          setTotal(data.meta.total);
          rentalCategoriesCache.set(key, { categories: data.data, total: data.meta.total });
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to load rental categories.";
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
    categories,
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


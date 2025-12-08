"use client";

import { useEffect, useState } from "react";
import { categoriesApi, type GetCategoriesParams } from "../../lib/apiClient";
import type { Category } from "../../lib/types";

// Simple in-memory cache scoped to this module for the lifetime of the page.
const categoriesCache = new Map<string, { categories: Category[]; total: number }>();

export function invalidateCategoriesCache() {
  categoriesCache.clear();
}

export function useCategoriesList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetCategoriesParams>({});

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      // Serve from cache if we already fetched this page during this session
      if (categoriesCache.has(key)) {
        const cached = categoriesCache.get(key)!;
        setCategories(cached.categories);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await categoriesApi.getCategories({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setCategories(data.data);
          setTotal(data.meta.total);
          categoriesCache.set(key, { categories: data.data, total: data.meta.total });
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to load categories.";
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
  }, [page, perPage, filters]);

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
  };
}

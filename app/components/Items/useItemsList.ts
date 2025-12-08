"use client";

import { useEffect, useState } from "react";
import { itemsApi, type GetItemsParams } from "../../lib/apiClient";
import type { Item } from "../../lib/types";

// Simple in-memory cache scoped to this module for the lifetime of the page.
const itemsCache = new Map<string, { items: Item[]; total: number }>();

export function invalidateItemsCache() {
  itemsCache.clear();
}

export function useItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetItemsParams>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateItemsCache();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      // Serve from cache if we already fetched this page during this session
      if (itemsCache.has(key)) {
        const cached = itemsCache.get(key)!;
        setItems(cached.items);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await itemsApi.getItems({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setItems(data.data);
          setTotal(data.meta.total);
          itemsCache.set(key, { items: data.data, total: data.meta.total });
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to load items.";
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
    items,
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

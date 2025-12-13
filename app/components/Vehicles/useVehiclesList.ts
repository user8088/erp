"use client";

import { useEffect, useState } from "react";
import { vehiclesApi, type GetVehiclesParams } from "../../lib/apiClient";
import type { Vehicle } from "../../lib/types";

// Simple in-memory cache scoped to this module for the lifetime of the page.
const vehiclesCache = new Map<string, { vehicles: Vehicle[]; total: number }>();

export function invalidateVehiclesCache() {
  vehiclesCache.clear();
}

export function useVehiclesList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetVehiclesParams>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateVehiclesCache();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      // Serve from cache if we already fetched this page during this session
      if (vehiclesCache.has(key)) {
        const cached = vehiclesCache.get(key)!;
        setVehicles(cached.vehicles);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await vehiclesApi.getVehicles({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setVehicles(data.data);
          setTotal(data.meta.total);
          vehiclesCache.set(key, { vehicles: data.data, total: data.meta.total });
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to load vehicles.";
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
    vehicles,
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


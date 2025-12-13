"use client";

import { useEffect, useState } from "react";
import { rentalApi, type GetRentalAgreementsParams } from "../../../lib/apiClient";
import type { RentalAgreement } from "../../../lib/types";

const rentalAgreementsCache = new Map<string, { agreements: RentalAgreement[]; total: number }>();

export function invalidateRentalAgreementsCache() {
  rentalAgreementsCache.clear();
}

export function useRentalAgreementsList() {
  const [agreements, setAgreements] = useState<RentalAgreement[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetRentalAgreementsParams>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateRentalAgreementsCache();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      if (rentalAgreementsCache.has(key)) {
        const cached = rentalAgreementsCache.get(key)!;
        setAgreements(cached.agreements);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await rentalApi.getAgreements({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setAgreements(data.data);
          setTotal(data.meta.total);
          rentalAgreementsCache.set(key, { agreements: data.data, total: data.meta.total });
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const errorMessage = e instanceof Error ? e.message : "Failed to load rental agreements.";
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
    agreements,
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


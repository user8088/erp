"use client";

import { useEffect, useState } from "react";
import { rentalApi } from "../../lib/apiClient";

interface RentalKPI {
  label: string;
  value: string;
}

export default function RentalSummary() {
  const [kpis, setKpis] = useState<RentalKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const [active, overdue] = await Promise.all([
          rentalApi.getAgreements({ per_page: 1, status: "active" }),
          rentalApi.getAgreements({ per_page: 1, status: "overdue" }),
        ]);

        setKpis([
          {
            label: "ACTIVE AGREEMENTS",
            value: `${active.meta.total}`,
          },
          {
            label: "OVERDUE AGREEMENTS",
            value: `${overdue.meta.total}`,
          },
        ]);
      } catch (e) {
        console.error("Failed to load rental summary:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load rental summary";
        setError(message);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, []);

  const displayData: RentalKPI[] =
    kpis.length > 0
      ? kpis
      : [
          {
            label: "ACTIVE AGREEMENTS",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "OVERDUE AGREEMENTS",
            value: loading ? "Loading..." : "0",
          },
        ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Rentals</h2>
        {error && (
          <span className="text-xs text-red-500 truncate max-w-xs">
            {error}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayData.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {kpi.label}
            </p>
            <p className="text-xl font-semibold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


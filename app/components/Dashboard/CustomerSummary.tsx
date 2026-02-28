"use client";

import { useEffect, useState } from "react";
import { customersApi } from "../../lib/apiClient";

interface CustomerKPI {
  label: string;
  value: string;
}

export default function CustomerSummary() {
  const [kpis, setKpis] = useState<CustomerKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const [all, withDues, highRating] = await Promise.all([
          customersApi.getCustomers({ per_page: 1 }),
          customersApi.getCustomers({ per_page: 1, status: "has_dues" }),
          customersApi.getCustomers({ per_page: 1, rating_filter: "8+" }),
        ]);

        setKpis([
          {
            label: "TOTAL CUSTOMERS",
            value: `${all.meta.total}`,
          },
          {
            label: "CUSTOMERS WITH DUES",
            value: `${withDues.meta.total}`,
          },
          {
            label: "HIGH-RATING CUSTOMERS (8+)",
            value: `${highRating.meta.total}`,
          },
        ]);
      } catch (e) {
        console.error("Failed to load customer summary:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load customer summary";
        setError(message);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, []);

  const displayData: CustomerKPI[] =
    kpis.length > 0
      ? kpis
      : [
          {
            label: "TOTAL CUSTOMERS",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "CUSTOMERS WITH DUES",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "HIGH-RATING CUSTOMERS (8+)",
            value: loading ? "Loading..." : "0",
          },
        ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Customers</h2>
        {error && (
          <span className="text-xs text-red-500 truncate max-w-xs">
            {error}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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


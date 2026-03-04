"use client";

import { useEffect, useState } from "react";
import { vehiclesApi } from "../../lib/apiClient";
import { formatCurrencyPkr } from "../../lib/format";

interface TransportKPI {
  label: string;
  value: string;
}

const formatCurrency = (amount: number): string => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(2)} L`;
  }
  if (absAmount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(2)} K`;
  }
  return `Rs ${amount.toFixed(2)}`;
};

export default function TransportSummary() {
  const [kpis, setKpis] = useState<TransportKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const vehicles = await vehiclesApi.getVehicles({
          per_page: 50,
          status: "active",
          include_stats: true,
        });

        const activeCount = vehicles.meta.total;

        let totalDeliveryCharges = 0;
        let totalMaintenanceCosts = 0;

        vehicles.data.forEach((vehicle: any) => {
          if (vehicle.profitability_stats) {
            totalDeliveryCharges +=
              vehicle.profitability_stats.total_delivery_charges ?? 0;
            totalMaintenanceCosts +=
              vehicle.profitability_stats.total_maintenance_costs ?? 0;
          }
        });

        const netProfit = totalDeliveryCharges - totalMaintenanceCosts;

        setKpis([
          {
            label: "ACTIVE VEHICLES",
            value: `${activeCount}`,
          },
          {
            label: "DELIVERY CHARGES",
            value: formatCurrencyPkr(totalDeliveryCharges),
          },
          {
            label: "MAINTENANCE COSTS",
            value: formatCurrencyPkr(totalMaintenanceCosts),
          },
          {
            label: "NET TRANSPORT PROFIT",
            value: formatCurrencyPkr(netProfit),
          },
        ]);
      } catch (e) {
        console.error("Failed to load transport summary:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load transport summary";
        setError(message);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, []);

  const displayData: TransportKPI[] =
    kpis.length > 0
      ? kpis
      : [
          {
            label: "ACTIVE VEHICLES",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "DELIVERY CHARGES",
            value: loading ? "Loading..." : "Rs 0.00",
          },
          {
            label: "MAINTENANCE COSTS",
            value: loading ? "Loading..." : "Rs 0.00",
          },
          {
            label: "NET TRANSPORT PROFIT",
            value: loading ? "Loading..." : "Rs 0.00",
          },
        ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Transport</h2>
        {error && (
          <span className="text-xs text-red-500 truncate max-w-xs">
            {error}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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


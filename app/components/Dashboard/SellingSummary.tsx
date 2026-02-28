"use client";

import { useEffect, useState } from "react";
import { salesApi } from "../../lib/apiClient";
import { DashboardPeriodState } from "./DashboardPeriodFilter";

interface SellingSummaryProps {
  period: DashboardPeriodState;
}

interface SellingKPI {
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

export default function SellingSummary({ period }: SellingSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<SellingKPI[]>([]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        // Derive a concrete date range from the dashboard period.
        // For non-custom periods we rely on the backend trends endpoint behaving correctly for the given range.
        const today = new Date();
        const year = today.getFullYear();
        let startDate: string;
        let endDate: string;

        if (period.period === "current_year") {
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
        } else if (period.period === "custom" && period.start_date && period.end_date) {
          startDate = period.start_date;
          endDate = period.end_date;
        } else {
          // current_month (default)
          const month = today.getMonth() + 1;
          startDate = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        }

        const trends = await salesApi.getSalesTrends({
          company_id: 1,
          period_type: "monthly",
          start_date: startDate,
          end_date: endDate,
        });

        const totalSalesAmount = trends.summary.total_revenue;
        const totalSalesCount = trends.summary.total_sales;
        const averageSaleValue = trends.summary.average_sale_value;

        const kpiData: SellingKPI[] = [
          {
            label: "TOTAL SALES AMOUNT",
            value: formatCurrency(totalSalesAmount),
          },
          {
            label: "TOTAL INVOICES",
            value: totalSalesCount.toString(),
          },
          {
            label: "AVERAGE INVOICE VALUE",
            value: formatCurrency(averageSaleValue),
          },
        ];

        setKpis(kpiData);
      } catch (e) {
        console.error("Failed to load selling summary:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load selling summary";
        setError(message);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [period.period, period.start_date, period.end_date]);

  const displayData: SellingKPI[] =
    kpis.length > 0
      ? kpis
      : [
          {
            label: "TOTAL SALES AMOUNT",
            value: loading ? "Loading..." : "Rs 0.00",
          },
          {
            label: "TOTAL INVOICES",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "AVERAGE INVOICE VALUE",
            value: loading ? "Loading..." : "Rs 0.00",
          },
        ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Selling Overview
        </h2>
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


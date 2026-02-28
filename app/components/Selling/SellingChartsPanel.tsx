"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { salesApi } from "../../lib/apiClient";
import type { Sale } from "../../lib/types";
import ChartContainer from "../Charts/ChartContainer";
import TabSwitcher from "../Charts/TabSwitcher";
import type { DashboardPeriodState } from "../Dashboard/DashboardPeriodFilter";

type SellingTab = "trends" | "top-items";

interface SellingChartsPanelProps {
  period?: DashboardPeriodState;
  compact?: boolean;
}

interface TrendsPoint {
  label: string;
  value: number;
  count?: number;
}

interface TopItemPoint {
  name: string;
  quantity: number;
  revenue: number;
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

function getDateRangeFromPeriod(period?: DashboardPeriodState): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const year = today.getFullYear();

  if (period?.period === "current_year") {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  if (period?.period === "custom" && period.start_date && period.end_date) {
    return {
      startDate: period.start_date,
      endDate: period.end_date,
    };
  }

  // Default to current month
  const month = today.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;
  return { startDate, endDate };
}

export default function SellingChartsPanel({
  period,
  compact = false,
}: SellingChartsPanelProps) {
  const [activeTab, setActiveTab] = useState<SellingTab>("top-items");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsPoint[]>([]);
  const [topItemsData, setTopItemsData] = useState<TopItemPoint[]>([]);

  const dateRange = useMemo(
    () => getDateRangeFromPeriod(period),
    [period?.period, period?.start_date, period?.end_date]
  );

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError(null);
      try {
        const trends = await salesApi.getSalesTrends({
          company_id: 1,
          period_type: "monthly",
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });
        const mapped: TrendsPoint[] = trends.data.map((d) => ({
          label: d.period,
          value: d.value,
          count: d.count,
        }));
        setTrendsData(mapped);
      } catch (e) {
        console.error("Failed to load sales trends:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load sales trends";
        setError(message);
        setTrendsData([]);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "trends") {
      void fetchTrends();
    }
  }, [activeTab, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    const fetchTopItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const sales = await salesApi.getSales({
          per_page: 100,
          status: "completed",
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
        });

        const totals = new Map<
          string,
          { quantity: number; revenue: number }
        >();

        (sales.data as Sale[]).forEach((sale) => {
          sale.items?.forEach((item) => {
            const label = item.item?.name ?? `Item #${item.item_id}`;
            const current = totals.get(label) ?? {
              quantity: 0,
              revenue: 0,
            };
            current.quantity += item.quantity;
            current.revenue += item.total;
            totals.set(label, current);
          });
        });

        const sorted: TopItemPoint[] = Array.from(totals.entries())
          .map(([name, v]) => ({
            name,
            quantity: v.quantity,
            revenue: v.revenue,
          }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 8);

        setTopItemsData(sorted);
      } catch (e) {
        console.error("Failed to load top items:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load top items";
        setError(message);
        setTopItemsData([]);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "top-items") {
      void fetchTopItems();
    }
  }, [activeTab, dateRange.startDate, dateRange.endDate]);

  const tabs = [
    { id: "trends", label: "Trends" },
    { id: "top-items", label: "Most sold items" },
  ];

  const rightElement = (
    <TabSwitcher tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as SellingTab)} />
  );

  const minHeight = compact ? 260 : 320;

  const noTrendData =
    activeTab === "trends" && !loading && !error && trendsData.length === 0;
  const noTopItemsData =
    activeTab === "top-items" && !loading && !error && topItemsData.length === 0;

  return (
    <ChartContainer
      title="Sales analytics"
      subtitle="Trends and most sold items"
      rightElement={rightElement}
      loading={loading}
      error={error}
      minHeight={minHeight}
    >
      {activeTab === "trends" ? (
        noTrendData ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            No sales trend data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendsData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickFormatter={(value: number) => formatCurrency(value).replace(
                "Rs ",
                ""
              )}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelClassName="text-xs font-medium text-gray-700"
              contentStyle={{
                borderRadius: 8,
                borderColor: "#E5E7EB",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f97316"
              fill="#fed7aa"
              strokeWidth={2}
              name="Revenue"
            />
          </AreaChart>
          </ResponsiveContainer>
        )
      ) : (
        noTopItemsData ? (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            No item sales data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topItemsData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              width={compact ? 110 : 140}
            />
            <Tooltip
              formatter={(value: number, name) =>
                name === "quantity"
                  ? [value.toLocaleString(), "Quantity"]
                  : [formatCurrency(value), "Revenue"]
              }
              labelClassName="text-xs font-medium text-gray-700"
              contentStyle={{
                borderRadius: 8,
                borderColor: "#E5E7EB",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="quantity"
              name="Quantity"
              fill="#3b82f6"
              radius={[4, 4, 4, 4]}
            />
          </BarChart>
          </ResponsiveContainer>
        )
      )}
    </ChartContainer>
  );
}


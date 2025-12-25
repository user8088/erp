"use client";

import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Filter, MoreVertical, X } from "lucide-react";
import { salesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";

interface ChartDataPoint {
  period: string;
  value: number;
  count?: number; // Optional: number of sales in this period
}

interface TooltipPayload {
  value: number;
  payload: ChartDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const formattedValue = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 relative">
        <p className="text-sm font-medium text-gray-700 mb-2">{label || data.period}</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-pink-500 rounded-sm"></div>
          <span className="text-sm font-semibold text-gray-900">
            Rs {formattedValue}
          </span>
        </div>
        {data.count !== undefined && (
          <p className="text-xs text-gray-500">{data.count} sale{data.count !== 1 ? 's' : ''}</p>
        )}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white"></div>
        <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-gray-200"></div>
      </div>
    );
  }
  return null;
};

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
type SaleTypeFilter = "all" | "walk-in" | "delivery";

export default function SalesOrderTrendsChart() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Filter state
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedStartMonth, setSelectedStartMonth] = useState<number>(1);
  const [selectedEndMonth, setSelectedEndMonth] = useState<number>(12);
  const [saleType, setSaleType] = useState<SaleTypeFilter>("all");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: number; name: string }>>([]);

  // Calculate date range based on filters
  const dateRange = useMemo(() => {
    if (periodType === "yearly") {
      // Show data for the selected year, grouped by quarters or months
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      };
    } else if (periodType === "quarterly") {
      // Show data for the selected year, grouped by quarters
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      };
    } else if (periodType === "monthly") {
      // Show data for selected year, grouped by months
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      };
    } else if (periodType === "weekly") {
      // Show data for selected year, grouped by weeks
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      };
    } else {
      // Daily - show data for selected month range
      const startDate = `${selectedYear}-${String(selectedStartMonth).padStart(2, "0")}-01`;
      const endYear = selectedEndMonth < selectedStartMonth ? selectedYear + 1 : selectedYear;
      const endMonth = selectedEndMonth < selectedStartMonth ? selectedEndMonth + 12 : selectedEndMonth;
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${endYear}-${String(selectedEndMonth <= 12 ? selectedEndMonth : selectedEndMonth - 12).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { startDate, endDate };
    }
  }, [periodType, selectedYear, selectedStartMonth, selectedEndMonth]);

  // Fetch customers for filter
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await salesApi.getSales({ per_page: 1 }); // Just to check API
        // We'll need a customers API call here, but for now we'll skip customer filter
      } catch (e) {
        // Ignore - customer filter is optional
      }
    };
    // fetchCustomers(); // Uncomment when customer API is available
  }, []);

  // Fetch sales trends data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const trendsData = await salesApi.getSalesTrends({
        company_id: 1, // TODO: Get from user context when available
        period_type: periodType,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        sale_type: saleType === "all" ? undefined : saleType,
        customer_id: customerId || undefined,
      });
      
      setChartData(trendsData.data);
    } catch (e) {
      console.error("Failed to fetch sales trends:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to load sales trends";
      setError(errorMessage);
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, dateRange.startDate, dateRange.endDate, saleType, customerId]);

  // Calculate Y-axis domain dynamically
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 400000];
    const maxValue = Math.max(...chartData.map(d => d.value));
    const roundedMax = Math.ceil(maxValue / 100000) * 100000 || 400000;
    return [0, roundedMax];
  }, [chartData]);

  const yAxisTicks = useMemo(() => {
    const [min, max] = yAxisDomain;
    const step = max / 4;
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      ticks.push(i * step);
    }
    return ticks;
  }, [yAxisDomain]);

  // Generate year and month options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sales Order Trends</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-2 hover:bg-gray-50 rounded transition-colors ${showFilter ? "bg-gray-100" : ""}`}
            title="Filter"
          >
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded transition-colors" title="More options">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Filter Options</h3>
            <button
              onClick={() => setShowFilter(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Period Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Group By</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Range (for daily period type) */}
            {periodType === "daily" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Month</label>
                  <select
                    value={selectedStartMonth}
                    onChange={(e) => setSelectedStartMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Month</label>
                  <select
                    value={selectedEndMonth}
                    onChange={(e) => setSelectedEndMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Sale Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sale Type</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value as SaleTypeFilter)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Sales</option>
                <option value="walk-in">Walk-in</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-80">
          <div className="text-sm text-gray-500">Loading chart data...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-80">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-80">
          <div className="text-sm text-gray-500">No data available for the selected period</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorPink" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="period"
              stroke="#9ca3af"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 100000) {
                  return `${value / 100000} L`;
                }
                return `${value / 1000}K`;
              }}
              domain={yAxisDomain}
              ticks={yAxisTicks}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#ec4899", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#ec4899"
              strokeWidth={2}
              fill="url(#colorPink)"
              dot={{ fill: "#ec4899", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}


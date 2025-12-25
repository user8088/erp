"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Filter, MoreVertical, X, AlertCircle, CheckCircle } from "lucide-react";
import { financialReportsApi } from "../../lib/apiClient";
import { ProfitLossReport, ProfitLossDiagnostics } from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

interface ChartDataPoint {
  period: string;
  Income: number;
  Expense: number;
  "Net Profit/Loss": number;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: ChartDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const colors: { [key: string]: string } = {
      Income: "#ec4899",
      Expense: "#3b82f6",
      "Net Profit/Loss": "#10b981",
    };

    const formatValue = (value: number) => {
      if (value >= 100000) {
        return `Rs ${(value / 100000).toFixed(2)} L`;
      }
      return `Rs ${(value / 1000).toFixed(2)} K`;
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-900 mb-2">{payload[0].payload.period}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm mb-1" style={{ color: colors[entry.name] || "#000" }}>
            {entry.name} : {formatValue(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type PeriodType = "month" | "year";
type ComparisonType = "none" | "previous_period" | "previous_year" | "custom";

export default function ProfitLossChart() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ProfitLossDiagnostics | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Filter state
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [comparisonType, setComparisonType] = useState<ComparisonType>("none");
  const [customComparisonYear, setCustomComparisonYear] = useState<number>(new Date().getFullYear() - 1);
  const [customComparisonMonth, setCustomComparisonMonth] = useState<number>(new Date().getMonth() + 1);

  // Calculate date ranges based on filters
  const dateRanges = useMemo(() => {
    if (periodType === "year") {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      let comparisonStartDate: string | undefined;
      let comparisonEndDate: string | undefined;
      
      if (comparisonType === "previous_year") {
        comparisonStartDate = `${selectedYear - 1}-01-01`;
        comparisonEndDate = `${selectedYear - 1}-12-31`;
      } else if (comparisonType === "custom") {
        comparisonStartDate = `${customComparisonYear}-01-01`;
        comparisonEndDate = `${customComparisonYear}-12-31`;
      }
      
      return { startDate, endDate, comparisonStartDate, comparisonEndDate };
    } else {
      // Month
      const year = selectedYear;
      const month = selectedMonth;
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      
      let comparisonStartDate: string | undefined;
      let comparisonEndDate: string | undefined;
      
      if (comparisonType === "previous_period") {
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        comparisonStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
        const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
        comparisonEndDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;
      } else if (comparisonType === "previous_year") {
        const prevYear = year - 1;
        comparisonStartDate = `${prevYear}-${String(month).padStart(2, "0")}-01`;
        const prevLastDay = new Date(prevYear, month, 0).getDate();
        comparisonEndDate = `${prevYear}-${String(month).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;
      } else if (comparisonType === "custom") {
        const compYear = customComparisonYear;
        const compMonth = customComparisonMonth;
        comparisonStartDate = `${compYear}-${String(compMonth).padStart(2, "0")}-01`;
        const compLastDay = new Date(compYear, compMonth, 0).getDate();
        comparisonEndDate = `${compYear}-${String(compMonth).padStart(2, "0")}-${String(compLastDay).padStart(2, "0")}`;
      }
      
      return { startDate, endDate, comparisonStartDate, comparisonEndDate };
    }
  }, [periodType, selectedYear, selectedMonth, comparisonType, customComparisonYear, customComparisonMonth]);

  // Fetch profit & loss data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const companyId = 1; // TODO: Get from user context when available
      
      // Build filters according to API specification
      const filters: any = {
        company_id: companyId,
        start_date: dateRanges.startDate,
        end_date: dateRanges.endDate,
      };

      // Add comparison type if not "none"
      if (comparisonType !== "none") {
        if (comparisonType === "custom") {
          // For custom comparison, provide explicit dates (don't send comparison_type)
          if (dateRanges.comparisonStartDate && dateRanges.comparisonEndDate) {
            filters.comparison_start_date = dateRanges.comparisonStartDate;
            filters.comparison_end_date = dateRanges.comparisonEndDate;
          }
        } else {
          // For previous_period or previous_year, let backend calculate dates automatically
          filters.comparison_type = comparisonType;
        }
      }

      const reportData = await financialReportsApi.getProfitLoss(filters);
      setReport(reportData);
      // The API returns previous_summary when comparison is enabled, so we don't need separate fetch
    } catch (e) {
      console.error("Failed to fetch profit & loss data:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to load profit & loss data";
      setError(errorMessage);
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRanges.startDate, dateRanges.endDate, comparisonType, dateRanges.comparisonStartDate, dateRanges.comparisonEndDate]);

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const companyId = 1; // TODO: Get from user context when available
      const diagnosticsData = await financialReportsApi.getProfitLossDiagnostics({
        company_id: companyId,
        start_date: dateRanges.startDate,
        end_date: dateRanges.endDate,
      });
      setDiagnostics(diagnosticsData);
      setShowDiagnostics(true);
    } catch (e) {
      console.error("Failed to fetch diagnostics:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to load diagnostics";
      addToast(errorMessage, "error");
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Transform report data to chart format
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!report) return [];

    const data: ChartDataPoint[] = [];
    
    // Current period
    const currentPeriodLabel = periodType === "year" 
      ? `${selectedYear}` 
      : new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    
    data.push({
      period: currentPeriodLabel,
      Income: report.summary.total_income,
      Expense: Math.abs(report.summary.total_operating_expenses + (report.summary.total_cogs || 0)),
      "Net Profit/Loss": report.summary.net_profit,
    });

    // Comparison period (if available from API response)
    if (report.previous_summary && comparisonType !== "none") {
      let comparisonPeriodLabel: string;
      
      if (comparisonType === "custom") {
        // Use custom comparison dates
        comparisonPeriodLabel = periodType === "year"
          ? `${customComparisonYear}`
          : new Date(customComparisonYear, customComparisonMonth - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      } else if (comparisonType === "previous_period") {
        // Previous period label
        if (periodType === "year") {
          comparisonPeriodLabel = `${selectedYear - 1}`;
        } else {
          const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
          const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
          comparisonPeriodLabel = new Date(prevYear, prevMonth - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }
      } else {
        // Previous year - same period
        comparisonPeriodLabel = periodType === "year"
          ? `${selectedYear - 1}`
          : new Date(selectedYear - 1, selectedMonth - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }
      
      data.push({
        period: comparisonPeriodLabel,
        Income: report.previous_summary.total_income,
        Expense: Math.abs(report.previous_summary.total_operating_expenses + (report.previous_summary.total_cogs || 0)),
        "Net Profit/Loss": report.previous_summary.net_profit,
      });
    }

    return data;
  }, [report, periodType, selectedYear, selectedMonth, comparisonType, customComparisonYear, customComparisonMonth]);

  // Calculate Y-axis domain dynamically (handle negative values for losses)
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 400000];
    
    const allValues = chartData.flatMap(d => [
      d.Income, 
      d.Expense, 
      Math.abs(d["Net Profit/Loss"])
    ]);
    
    const max = Math.max(...allValues);
    const min = Math.min(...chartData.flatMap(d => [d["Net Profit/Loss"]])); // Can be negative for losses
    
    // Round up max to nearest 100000, round down min to nearest 100000
    const maxValue = Math.ceil(max / 100000) * 100000 || 400000;
    const minValue = min < 0 ? Math.floor(min / 100000) * 100000 : 0;
    
    // Add 10% padding
    const padding = (maxValue - minValue) * 0.1;
    
    return [minValue - padding, maxValue + padding];
  }, [chartData]);

  const yAxisTicks = useMemo(() => {
    const [min, max] = yAxisDomain;
    const range = max - min;
    const step = range / 4;
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      ticks.push(min + (i * step));
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
        <h2 className="text-lg font-semibold text-gray-900">Profit and Loss</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`p-2 hover:bg-gray-50 rounded transition-colors ${showFilter ? "bg-gray-100" : ""}`}
            title="Filter"
          >
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={fetchDiagnostics}
            disabled={loadingDiagnostics}
            className="p-2 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
            title="Run Diagnostics"
          >
            <AlertCircle className="w-4 h-4 text-gray-600" />
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Period Type</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="month">Month</option>
                <option value="year">Year</option>
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

            {/* Month Selection (only for month period type) */}
            {periodType === "month" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Comparison Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Compare With</label>
              <select
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value as ComparisonType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="none">None</option>
                {periodType === "month" && <option value="previous_period">Previous Month</option>}
                <option value="previous_year">Previous Year</option>
                <option value="custom">Custom Period</option>
              </select>
            </div>

            {/* Custom Comparison Year */}
            {comparisonType === "custom" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Comparison Year</label>
                <select
                  value={customComparisonYear}
                  onChange={(e) => setCustomComparisonYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Comparison Month */}
            {comparisonType === "custom" && periodType === "month" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Comparison Month</label>
                <select
                  value={customComparisonMonth}
                  onChange={(e) => setCustomComparisonMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
        <div className="flex flex-col items-center justify-center h-80 gap-3">
          <div className="text-sm text-gray-500">No data available</div>
          <button
            onClick={fetchDiagnostics}
            disabled={loadingDiagnostics}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loadingDiagnostics ? "Loading..." : "Run Diagnostics"}
          </button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            barCategoryGap="30%"
          >
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
                const absValue = Math.abs(value);
                const sign = value < 0 ? "-" : "";
                if (absValue >= 100000) {
                  return `${sign}${absValue / 100000} L`;
                }
                return `${sign}${absValue / 1000}K`;
              }}
              domain={yAxisDomain}
              ticks={yAxisTicks}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Legend
              wrapperStyle={{ paddingTop: "24px" }}
              iconType="rect"
              iconSize={12}
              formatter={(value) => <span style={{ color: "#374151", fontSize: "12px" }}>{value}</span>}
            />
            <Bar
              dataKey="Income"
              fill="#ec4899"
              name="Income"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
            />
            <Bar
              dataKey="Expense"
              fill="#3b82f6"
              name="Expense"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
            />
            <Bar
              dataKey="Net Profit/Loss"
              fill="#10b981"
              name="Net Profit/Loss"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Diagnostics Panel */}
      {showDiagnostics && diagnostics && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Diagnostics Information</h3>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-gray-700 mb-1">Income Accounts</div>
                <div className={`flex items-center gap-2 ${diagnostics.income_accounts_count > 0 ? "text-green-600" : "text-red-600"}`}>
                  {diagnostics.income_accounts_count > 0 ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{diagnostics.income_accounts_count} found</span>
                </div>
                {diagnostics.income_accounts.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <div className="font-medium mb-1">Accounts:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostics.income_accounts.slice(0, 5).map((account) => (
                        <li key={account.id}>
                          {account.number ? `${account.number} - ` : ""}
                          {account.name}
                          {account.is_disabled && <span className="text-red-600"> (Disabled)</span>}
                        </li>
                      ))}
                      {diagnostics.income_accounts.length > 5 && (
                        <li className="text-gray-500">... and {diagnostics.income_accounts.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <div className="font-medium text-gray-700 mb-1">Journal Entries</div>
                <div className={`flex items-center gap-2 ${diagnostics.journal_entries_count > 0 ? "text-green-600" : "text-red-600"}`}>
                  {diagnostics.journal_entries_count > 0 ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{diagnostics.journal_entries_count} in date range</span>
                </div>
              </div>

              <div>
                <div className="font-medium text-gray-700 mb-1">Income Transactions</div>
                <div className={`flex items-center gap-2 ${diagnostics.income_transactions_count > 0 ? "text-green-600" : "text-red-600"}`}>
                  {diagnostics.income_transactions_count > 0 ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{diagnostics.income_transactions_count} transactions</span>
                </div>
                {diagnostics.total_income_amount > 0 && (
                  <div className="mt-1 text-xs text-gray-600">
                    Total: Rs {diagnostics.total_income_amount.toLocaleString()}
                  </div>
                )}
              </div>

              <div>
                <div className="font-medium text-gray-700 mb-1">Sales Revenue Mapping</div>
                {diagnostics.sales_revenue_mapping ? (
                  <>
                    <div className={`flex items-center gap-2 ${diagnostics.sales_revenue_mapping.exists ? "text-green-600" : "text-red-600"}`}>
                      {diagnostics.sales_revenue_mapping.exists ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span>{diagnostics.sales_revenue_mapping.exists ? "Configured" : "Not Configured"}</span>
                    </div>
                    {diagnostics.sales_revenue_mapping.exists && diagnostics.sales_revenue_mapping.account_name && (
                      <div className="mt-1 text-xs text-gray-600">
                        {diagnostics.sales_revenue_mapping.account_number ? `${diagnostics.sales_revenue_mapping.account_number} - ` : ""}
                        {diagnostics.sales_revenue_mapping.account_name}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Not Configured</span>
                  </div>
                )}
              </div>
            </div>

            {diagnostics.income_accounts_count === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Issue:</strong> No income accounts found. Create income accounts in Chart of Accounts.
              </div>
            )}

            {diagnostics.journal_entries_count === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Issue:</strong> No journal entries found in this date range. Ensure sales are creating journal entries.
              </div>
            )}

            {diagnostics.income_transactions_count === 0 && diagnostics.journal_entries_count > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Issue:</strong> Journal entries exist but no income transactions found. Check account mappings and ensure sales are posting to income accounts.
              </div>
            )}

            {(!diagnostics.sales_revenue_mapping || !diagnostics.sales_revenue_mapping.exists) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Issue:</strong> Sales revenue account mapping not configured. Configure it in Selling Settings.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


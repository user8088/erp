"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, ProfitabilityAnalysis } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ProfitabilityAnalysisPage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ProfitabilityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");

  const [filters, setFilters] = useState<ReportFilters>({
    company_id: 1,
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    comparison_type: "previous_year",
  });

  const loadReport = async () => {
    if (!canReadAccounting) return;

    setLoading(true);
    setError(null);
    try {
      const data = await financialReportsApi.getProfitabilityAnalysis(filters);
      setReport(data);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to load Profitability Analysis.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [filters]);

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    addToast(`Export to ${format.toUpperCase()} will be available soon.`, "info");
  };

  const handlePrint = () => {
    window.print();
  };

  const formatNumber = (value: number, unit: string) => {
    if (unit === "%") {
      return `${value.toFixed(2)}%`;
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getTrendIcon = (trend: "up" | "down" | "stable" | null) => {
    if (!trend) return null;
    if (trend === "up") {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trend === "down") {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  if (!canReadAccounting) {
    return (
      <div className="max-w-7xl mx-auto min-h-full py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Accounting Access Required</h1>
        <p className="text-sm text-gray-600">
          You don&apos;t have permission to view financial reports. Please contact your system
          administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profitability Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze key profitability ratios and metrics for your business.
        </p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        onPrint={handlePrint}
        loading={loading}
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading && !report && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-sm text-gray-500">Loading analysis...</div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.ratios.slice(0, 4).map((ratio) => (
              <div key={ratio.name} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500">{ratio.label}</div>
                  {getTrendIcon(ratio.trend)}
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(ratio.value, ratio.unit)}
                </div>
                {ratio.previous_value !== null && ratio.previous_value !== undefined && (
                  <div className="text-xs text-gray-500 mt-1">
                    Previous: {formatNumber(ratio.previous_value, ratio.unit)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Detailed Ratios Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Profitability Ratios</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Ratio
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Current Value
                    </th>
                    {filters.comparison_type !== "none" && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Previous Value
                      </th>
                    )}
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.ratios.map((ratio) => (
                    <tr
                      key={ratio.name}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-900">{ratio.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{ratio.description}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        {formatNumber(ratio.value, ratio.unit)}
                      </td>
                      {filters.comparison_type !== "none" && (
                        <td className="py-3 px-4 text-right text-sm text-gray-700">
                          {ratio.previous_value !== null && ratio.previous_value !== undefined
                            ? formatNumber(ratio.previous_value, ratio.unit)
                            : "—"}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {getTrendIcon(ratio.trend || null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, TrendAnalysis, ReportPeriod } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";
import TrendChart from "../components/FinancialReports/TrendChart";

export default function SalesInvoiceTrendsPage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TrendAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");

  const [filters, setFilters] = useState<ReportFilters>({
    company_id: 1,
    start_date: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    comparison_type: "none",
  });
  const [period, setPeriod] = useState<ReportPeriod>("monthly");

  const loadReport = async () => {
    if (!canReadAccounting) return;

    setLoading(true);
    setError(null);
    try {
      const data = await financialReportsApi.getTrendAnalysis({
        ...filters,
        metric: "revenue",
        period: period,
      });
      setReport(data);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to load Sales Invoice Trends.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canReadAccounting) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, period, canReadAccounting]);

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    addToast(`Export to ${format.toUpperCase()} will be available soon.`, "info");
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
        <h1 className="text-2xl font-semibold text-gray-900">Sales Invoice Trends</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze revenue trends over time from sales invoices.
        </p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        onPrint={handlePrint}
        showComparison={false}
        loading={loading}
      />

      {/* Period Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Group By Period
        </label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
          className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
          disabled={loading}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading && !report && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-sm text-gray-500">Loading trends...</div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Trend</div>
                <div className="text-lg font-semibold text-gray-900 capitalize mt-1">
                  {report.trend}
                </div>
              </div>
              {report.average_growth_rate !== null && report.average_growth_rate !== undefined && (
                <div>
                  <div className="text-sm text-gray-500">Average Growth Rate</div>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {report.average_growth_rate.toFixed(2)}%
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Data Points</div>
                <div className="text-lg font-semibold text-gray-900 mt-1">
                  {report.data_points.length}
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          {report.data_points.length > 0 && (
            <TrendChart data={report.data_points} metric="revenue" trend={report.trend} />
          )}

          {/* Trends Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Trends</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Period
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.data_points.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-sm text-gray-500">
                        No data available for the selected period.
                      </td>
                    </tr>
                  ) : (
                    report.data_points.map((point, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {point.label}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(point.value)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


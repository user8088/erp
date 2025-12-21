"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, ProfitLossReport } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";

export default function GrossProfitPage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");

  const [filters, setFilters] = useState<ReportFilters>({
    company_id: 1,
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    comparison_type: "previous_period",
  });

  const loadReport = async () => {
    if (!canReadAccounting) return;

    setLoading(true);
    setError(null);
    try {
      const data = await financialReportsApi.getProfitLoss(filters);
      setReport(data);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to load Gross Profit report.";
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0.00%";
    return `${((value / total) * 100).toFixed(2)}%`;
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

  const incomeLines = report?.lines.filter((l) => l.section === "income") || [];
  const cogsLines = report?.lines.filter((l) => l.section === "cogs") || [];
  const totalIncome = incomeLines.reduce((sum, line) => sum + line.current_period, 0);
  const totalCOGS = cogsLines.reduce((sum, line) => sum + line.current_period, 0);
  const grossProfit = totalIncome - totalCOGS;
  const grossProfitMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  // Previous period calculations
  const previousTotalIncome = report?.previous_summary?.total_income || 0;
  const previousTotalCOGS = report?.previous_summary?.total_cogs || 0;
  const previousGrossProfit = previousTotalIncome - previousTotalCOGS;
  const previousGrossProfitMargin =
    previousTotalIncome > 0 ? (previousGrossProfit / previousTotalIncome) * 100 : 0;

  const incomeChange = totalIncome - previousTotalIncome;
  const cogsChange = totalCOGS - previousTotalCOGS;
  const grossProfitChange = grossProfit - previousGrossProfit;
  const marginChange = grossProfitMargin - previousGrossProfitMargin;

  return (
    <div className="max-w-7xl mx-auto min-h-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gross Profit Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze gross profit, revenue, and cost of goods sold for the selected period.
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
          <div className="text-sm text-gray-500">Loading report...</div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-2xl font-semibold text-blue-600 mt-1">
                {formatCurrency(totalIncome)}
              </div>
              {filters.comparison_type !== "none" && previousTotalIncome > 0 && (
                <div className="text-xs mt-1">
                  <span
                    className={
                      incomeChange >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {incomeChange >= 0 ? "+" : ""}
                    {formatCurrency(incomeChange)} (
                    {((incomeChange / previousTotalIncome) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Cost of Goods Sold</div>
              <div className="text-2xl font-semibold text-red-600 mt-1">
                {formatCurrency(totalCOGS)}
              </div>
              {filters.comparison_type !== "none" && previousTotalCOGS > 0 && (
                <div className="text-xs mt-1">
                  <span
                    className={
                      cogsChange <= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {cogsChange >= 0 ? "+" : ""}
                    {formatCurrency(cogsChange)} (
                    {((cogsChange / previousTotalCOGS) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Gross Profit</div>
              <div className="text-2xl font-semibold text-green-600 mt-1">
                {formatCurrency(grossProfit)}
              </div>
              {filters.comparison_type !== "none" && previousGrossProfit > 0 && (
                <div className="text-xs mt-1">
                  <span
                    className={
                      grossProfitChange >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {grossProfitChange >= 0 ? "+" : ""}
                    {formatCurrency(grossProfitChange)} (
                    {((grossProfitChange / previousGrossProfit) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Gross Profit Margin</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {grossProfitMargin.toFixed(2)}%
              </div>
              {filters.comparison_type !== "none" && previousGrossProfitMargin > 0 && (
                <div className="text-xs mt-1">
                  <span
                    className={
                      marginChange >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {marginChange >= 0 ? "+" : ""}
                    {marginChange.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Gross Profit Breakdown</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue</h3>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                          Account
                        </th>
                        <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                          Current Period
                        </th>
                        {filters.comparison_type !== "none" && (
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                            Previous Period
                          </th>
                        )}
                        <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeLines.map((line) => (
                        <tr key={line.account_id} className="border-b border-gray-100">
                          <td className="py-2 px-4 text-sm text-gray-900">
                            {line.account_number && (
                              <span className="text-xs text-gray-500 mr-2">{line.account_number}</span>
                            )}
                            {line.account_name}
                          </td>
                          <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(line.current_period)}
                          </td>
                          {filters.comparison_type !== "none" && (
                            <td className="py-2 px-4 text-right text-sm text-gray-600">
                              {line.previous_period !== undefined
                                ? formatCurrency(line.previous_period)
                                : "—"}
                            </td>
                          )}
                          <td className="py-2 px-4 text-right text-sm text-gray-600">
                            {formatPercentage(line.current_period, totalIncome)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-semibold">
                        <td className="py-2 px-4 text-sm text-gray-900">Total Revenue</td>
                        <td className="py-2 px-4 text-right text-sm text-gray-900">
                          {formatCurrency(totalIncome)}
                        </td>
                        {filters.comparison_type !== "none" && (
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(previousTotalIncome)}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right text-sm text-gray-900">100.00%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* COGS Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost of Goods Sold</h3>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                          Account
                        </th>
                        <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                          Current Period
                        </th>
                        {filters.comparison_type !== "none" && (
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                            Previous Period
                          </th>
                        )}
                        <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cogsLines.map((line) => (
                        <tr key={line.account_id} className="border-b border-gray-100">
                          <td className="py-2 px-4 text-sm text-gray-900">
                            {line.account_number && (
                              <span className="text-xs text-gray-500 mr-2">{line.account_number}</span>
                            )}
                            {line.account_name}
                          </td>
                          <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(line.current_period)}
                          </td>
                          {filters.comparison_type !== "none" && (
                            <td className="py-2 px-4 text-right text-sm text-gray-600">
                              {line.previous_period !== undefined
                                ? formatCurrency(line.previous_period)
                                : "—"}
                            </td>
                          )}
                          <td className="py-2 px-4 text-right text-sm text-gray-600">
                            {formatPercentage(line.current_period, totalIncome)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-50 font-semibold">
                        <td className="py-2 px-4 text-sm text-gray-900">Total COGS</td>
                        <td className="py-2 px-4 text-right text-sm text-gray-900">
                          {formatCurrency(totalCOGS)}
                        </td>
                        {filters.comparison_type !== "none" && (
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(previousTotalCOGS)}
                          </td>
                        )}
                        <td className="py-2 px-4 text-right text-sm text-gray-900">
                          {formatPercentage(totalCOGS, totalIncome)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gross Profit Summary */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">Gross Profit</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(grossProfit)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Margin: {grossProfitMargin.toFixed(2)}%
                      </div>
                      {filters.comparison_type !== "none" && previousGrossProfit > 0 && (
                        <div className="text-xs mt-1">
                          <span
                            className={
                              grossProfitChange >= 0 ? "text-green-700" : "text-red-700"
                            }
                          >
                            {grossProfitChange >= 0 ? "+" : ""}
                            {formatCurrency(grossProfitChange)} vs Previous Period
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, BalanceSheetReport } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2 } from "lucide-react";

export default function BalanceSheetPage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");

  const [filters, setFilters] = useState<ReportFilters>({
    company_id: 1,
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    comparison_type: "previous_period",
  });

  const loadReport = async () => {
    if (!canReadAccounting) return;

    setLoading(true);
    setError(null);
    try {
      const data = await financialReportsApi.getBalanceSheet(filters);
      setReport(data);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to load Balance Sheet.";
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

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getChangeIndicator = (change?: number) => {
    if (change === undefined || change === null) return null;
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const formatChange = (change?: number) => {
    if (change === undefined || change === null) return "—";
    const sign = change > 0 ? "+" : "";
    return `${sign}${formatNumber(change)}`;
  };

  const formatPercentage = (percentage?: number) => {
    if (percentage === undefined || percentage === null) return "—";
    const sign = percentage > 0 ? "+" : "";
    return `${sign}${formatNumber(percentage)}%`;
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

  const groupedLines = report?.lines.reduce((acc, line) => {
    if (!acc[line.section]) {
      acc[line.section] = [];
    }
    acc[line.section].push(line);
    return acc;
  }, {} as Record<string, typeof report.lines>) || {};

  const sectionLabels: Record<string, string> = {
    current_assets: "Current Assets",
    fixed_assets: "Fixed Assets",
    intangible_assets: "Intangible Assets",
    other_assets: "Other Assets",
    current_liabilities: "Current Liabilities",
    long_term_liabilities: "Long-term Liabilities",
    other_liabilities: "Other Liabilities",
    equity: "Equity",
    retained_earnings: "Retained Earnings",
  };

  const assetSections = [
    "current_assets",
    "fixed_assets",
    "intangible_assets",
    "other_assets",
  ];
  const liabilitySections = [
    "current_liabilities",
    "long_term_liabilities",
    "other_liabilities",
  ];
  const equitySections = ["equity", "retained_earnings"];

  return (
    <div className="max-w-7xl mx-auto min-h-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Balance Sheet</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your company&apos;s assets, liabilities, and equity as of the selected date.
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
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Balance Sheet</h2>
                <p className="text-sm text-gray-600 mt-1">
                  As of: {new Date(filters.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {report.summary.is_balanced ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Balanced</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Not Balanced</span>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Generated</div>
                  <div className="text-sm text-gray-700">
                    {new Date(report.generated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Column */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">ASSETS</h3>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <tbody>
                    {assetSections.map((section) => {
                      const lines = groupedLines[section] || [];
                      if (lines.length === 0) return null;

                      return (
                        <React.Fragment key={section}>
                          <tr>
                            <td colSpan={filters.comparison_type !== "none" ? 4 : 2} className="py-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {sectionLabels[section]}
                              </span>
                            </td>
                          </tr>
                          {lines.map((line) => (
                            <tr key={line.account_id} className="hover:bg-gray-50">
                              <td className="py-2 pl-4">
                                <div className="flex items-center gap-2">
                                  {line.account_number && (
                                    <span className="text-xs text-gray-500">{line.account_number}</span>
                                  )}
                                  <span className="text-sm text-gray-900">{line.account_name}</span>
                                </div>
                              </td>
                              <td className="py-2 text-right text-sm font-medium text-gray-900">
                                {formatCurrency(line.current_period)}
                              </td>
                              {filters.comparison_type !== "none" && (
                                <>
                                  <td className="py-2 text-right text-sm text-gray-700">
                                    {line.previous_period !== undefined
                                      ? formatCurrency(line.previous_period)
                                      : "—"}
                                  </td>
                                  <td className="py-2 text-right text-sm">
                                    <div className="flex items-center justify-end gap-1">
                                      {getChangeIndicator(line.change_amount)}
                                      <span
                                        className={
                                          (line.change_amount || 0) > 0
                                            ? "text-green-600"
                                            : (line.change_amount || 0) < 0
                                              ? "text-red-600"
                                              : "text-gray-600"
                                        }
                                      >
                                        {formatChange(line.change_amount)}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                          <tr className="bg-gray-100">
                            <td className="py-2 pl-4">
                              <span className="text-sm font-semibold text-gray-900">
                                Total {sectionLabels[section]}
                              </span>
                            </td>
                            <td className="py-2 text-right text-sm font-semibold text-gray-900">
                              {formatCurrency(
                                lines.reduce((sum, line) => sum + line.current_period, 0)
                              )}
                            </td>
                            {filters.comparison_type !== "none" && (
                              <>
                                <td className="py-2 text-right text-sm font-semibold text-gray-700">
                                  {formatCurrency(
                                    lines.reduce(
                                      (sum, line) => sum + (line.previous_period || 0),
                                      0
                                    )
                                  )}
                                </td>
                                <td></td>
                              </>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    <tr>
                      <td colSpan={filters.comparison_type !== "none" ? 4 : 2} className="py-4">
                        <div className="border-t-2 border-gray-300"></div>
                      </td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-3">
                        <span className="text-base font-bold text-gray-900">TOTAL ASSETS</span>
                      </td>
                      <td className="py-3 text-right text-base font-bold text-gray-900">
                        {formatCurrency(report.summary.total_assets)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-3 text-right text-base font-bold text-gray-700">
                            {formatCurrency(report.previous_summary.total_assets)}
                          </td>
                          <td></td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Liabilities & Equity Column */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-green-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">LIABILITIES & EQUITY</h3>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <tbody>
                    {liabilitySections.map((section) => {
                      const lines = groupedLines[section] || [];
                      if (lines.length === 0) return null;

                      return (
                        <React.Fragment key={section}>
                          <tr>
                            <td colSpan={filters.comparison_type !== "none" ? 4 : 2} className="py-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {sectionLabels[section]}
                              </span>
                            </td>
                          </tr>
                          {lines.map((line) => (
                            <tr key={line.account_id} className="hover:bg-gray-50">
                              <td className="py-2 pl-4">
                                <div className="flex items-center gap-2">
                                  {line.account_number && (
                                    <span className="text-xs text-gray-500">{line.account_number}</span>
                                  )}
                                  <span className="text-sm text-gray-900">{line.account_name}</span>
                                </div>
                              </td>
                              <td className="py-2 text-right text-sm font-medium text-gray-900">
                                {formatCurrency(line.current_period)}
                              </td>
                              {filters.comparison_type !== "none" && (
                                <>
                                  <td className="py-2 text-right text-sm text-gray-700">
                                    {line.previous_period !== undefined
                                      ? formatCurrency(line.previous_period)
                                      : "—"}
                                  </td>
                                  <td className="py-2 text-right text-sm">
                                    <div className="flex items-center justify-end gap-1">
                                      {getChangeIndicator(line.change_amount)}
                                      <span
                                        className={
                                          (line.change_amount || 0) > 0
                                            ? "text-green-600"
                                            : (line.change_amount || 0) < 0
                                              ? "text-red-600"
                                              : "text-gray-600"
                                        }
                                      >
                                        {formatChange(line.change_amount)}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                          <tr className="bg-gray-100">
                            <td className="py-2 pl-4">
                              <span className="text-sm font-semibold text-gray-900">
                                Total {sectionLabels[section]}
                              </span>
                            </td>
                            <td className="py-2 text-right text-sm font-semibold text-gray-900">
                              {formatCurrency(
                                lines.reduce((sum, line) => sum + line.current_period, 0)
                              )}
                            </td>
                            {filters.comparison_type !== "none" && (
                              <>
                                <td className="py-2 text-right text-sm font-semibold text-gray-700">
                                  {formatCurrency(
                                    lines.reduce(
                                      (sum, line) => sum + (line.previous_period || 0),
                                      0
                                    )
                                  )}
                                </td>
                                <td></td>
                              </>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    {equitySections.map((section) => {
                      const lines = groupedLines[section] || [];
                      if (lines.length === 0) return null;

                      return (
                        <React.Fragment key={section}>
                          <tr>
                            <td colSpan={filters.comparison_type !== "none" ? 4 : 2} className="py-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {sectionLabels[section]}
                              </span>
                            </td>
                          </tr>
                          {lines.map((line) => (
                            <tr key={line.account_id} className="hover:bg-gray-50">
                              <td className="py-2 pl-4">
                                <div className="flex items-center gap-2">
                                  {line.account_number && (
                                    <span className="text-xs text-gray-500">{line.account_number}</span>
                                  )}
                                  <span className="text-sm text-gray-900">{line.account_name}</span>
                                </div>
                              </td>
                              <td className="py-2 text-right text-sm font-medium text-gray-900">
                                {formatCurrency(line.current_period)}
                              </td>
                              {filters.comparison_type !== "none" && (
                                <>
                                  <td className="py-2 text-right text-sm text-gray-700">
                                    {line.previous_period !== undefined
                                      ? formatCurrency(line.previous_period)
                                      : "—"}
                                  </td>
                                  <td className="py-2 text-right text-sm">
                                    <div className="flex items-center justify-end gap-1">
                                      {getChangeIndicator(line.change_amount)}
                                      <span
                                        className={
                                          (line.change_amount || 0) > 0
                                            ? "text-green-600"
                                            : (line.change_amount || 0) < 0
                                              ? "text-red-600"
                                              : "text-gray-600"
                                        }
                                      >
                                        {formatChange(line.change_amount)}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                          <tr className="bg-gray-100">
                            <td className="py-2 pl-4">
                              <span className="text-sm font-semibold text-gray-900">
                                Total {sectionLabels[section]}
                              </span>
                            </td>
                            <td className="py-2 text-right text-sm font-semibold text-gray-900">
                              {formatCurrency(
                                lines.reduce((sum, line) => sum + line.current_period, 0)
                              )}
                            </td>
                            {filters.comparison_type !== "none" && (
                              <>
                                <td className="py-2 text-right text-sm font-semibold text-gray-700">
                                  {formatCurrency(
                                    lines.reduce(
                                      (sum, line) => sum + (line.previous_period || 0),
                                      0
                                    )
                                  )}
                                </td>
                                <td></td>
                              </>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    <tr>
                      <td colSpan={filters.comparison_type !== "none" ? 4 : 2} className="py-4">
                        <div className="border-t-2 border-gray-300"></div>
                      </td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td className="py-2">
                        <span className="text-sm font-semibold text-gray-900">Total Liabilities</span>
                      </td>
                      <td className="py-2 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(report.summary.total_liabilities)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 text-right text-sm font-semibold text-gray-700">
                            {formatCurrency(report.previous_summary.total_liabilities)}
                          </td>
                          <td></td>
                        </>
                      )}
                    </tr>
                    <tr className="bg-gray-100">
                      <td className="py-2">
                        <span className="text-sm font-semibold text-gray-900">Total Equity</span>
                      </td>
                      <td className="py-2 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(report.summary.total_equity)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 text-right text-sm font-semibold text-gray-700">
                            {formatCurrency(report.previous_summary.total_equity)}
                          </td>
                          <td></td>
                        </>
                      )}
                    </tr>
                    <tr>
                      <td colSpan={filters.comparison_type !== "none" ? 4 : 2} className="py-4">
                        <div className="border-t-2 border-gray-300"></div>
                      </td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="py-3">
                        <span className="text-base font-bold text-gray-900">
                          TOTAL LIABILITIES & EQUITY
                        </span>
                      </td>
                      <td className="py-3 text-right text-base font-bold text-gray-900">
                        {formatCurrency(
                          report.summary.total_liabilities + report.summary.total_equity
                        )}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-3 text-right text-base font-bold text-gray-700">
                            {formatCurrency(
                              (report.previous_summary?.total_liabilities || 0) +
                                (report.previous_summary?.total_equity || 0)
                            )}
                          </td>
                          <td></td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Working Capital</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(report.summary.working_capital)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Current Assets - Current Liabilities
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total Assets</div>
              <div className="text-2xl font-semibold text-blue-600 mt-1">
                {formatCurrency(report.summary.total_assets)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">Total Liabilities & Equity</div>
              <div className="text-2xl font-semibold text-green-600 mt-1">
                {formatCurrency(
                  report.summary.total_liabilities + report.summary.total_equity
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


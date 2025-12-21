"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, ProfitLossReport } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ProfitAndLossStatementPage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");

  const [filters, setFilters] = useState<ReportFilters>({
    company_id: 1, // TODO: Get from user context
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    comparison_type: "none",
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
      const message = e instanceof Error ? e.message : "Failed to load Profit & Loss Statement.";
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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Accounting Access Required
        </h1>
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
    income: "Income",
    cogs: "Cost of Goods Sold",
    operating_expense: "Operating Expenses",
    non_operating_income: "Non-Operating Income",
    non_operating_expense: "Non-Operating Expenses",
    tax: "Tax",
    other: "Other",
  };

  const sectionOrder = [
    "income",
    "cogs",
    "operating_expense",
    "non_operating_income",
    "non_operating_expense",
    "tax",
    "other",
  ];

  return (
    <div className="max-w-7xl mx-auto min-h-full py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profit & Loss Statement</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your company&apos;s income, expenses, and profitability for the selected period.
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
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Profit & Loss Statement</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Period: {new Date(filters.start_date).toLocaleDateString()} -{" "}
                  {new Date(filters.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Generated</div>
                <div className="text-sm text-gray-700">
                  {new Date(report.generated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Account
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Current Period
                  </th>
                  {filters.comparison_type !== "none" && (
                    <>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Previous Period
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Change
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        % Change
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Income Section */}
                {sectionOrder.map((section) => {
                  const lines = groupedLines[section] || [];
                  if (lines.length === 0) return null;

                  return (
                    <React.Fragment key={section}>
                      <tr className="bg-gray-50">
                        <td colSpan={filters.comparison_type !== "none" ? 5 : 2} className="py-2 px-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {sectionLabels[section]}
                          </span>
                        </td>
                      </tr>
                      {lines.map((line) => (
                        <tr key={line.account_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              {line.account_number && (
                                <span className="text-xs text-gray-500">{line.account_number}</span>
                              )}
                              <span className="text-sm text-gray-900">{line.account_name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(line.current_period)}
                          </td>
                          {filters.comparison_type !== "none" && (
                            <>
                              <td className="py-2 px-4 text-right text-sm text-gray-700">
                                {line.previous_period !== undefined
                                  ? formatCurrency(line.previous_period)
                                  : "—"}
                              </td>
                              <td className="py-2 px-4 text-right text-sm">
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
                              <td className="py-2 px-4 text-right text-sm">
                                <span
                                  className={
                                    (line.change_percentage || 0) > 0
                                      ? "text-green-600"
                                      : (line.change_percentage || 0) < 0
                                        ? "text-red-600"
                                        : "text-gray-600"
                                  }
                                >
                                  {formatPercentage(line.change_percentage)}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {/* Section Total */}
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <td className="py-2 px-4">
                          <span className="text-sm font-semibold text-gray-900">
                            Total {sectionLabels[section]}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(
                            lines.reduce((sum, line) => sum + line.current_period, 0)
                          )}
                        </td>
                        {filters.comparison_type !== "none" && (
                          <>
                            <td className="py-2 px-4 text-right text-sm font-semibold text-gray-700">
                              {formatCurrency(
                                lines.reduce(
                                  (sum, line) => sum + (line.previous_period || 0),
                                  0
                                )
                              )}
                            </td>
                            <td colSpan={2}></td>
                          </>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Summary Section */}
                {report.summary && (
                  <>
                    <tr>
                      <td colSpan={filters.comparison_type !== "none" ? 5 : 2} className="py-4">
                        <div className="border-t-2 border-gray-300"></div>
                      </td>
                    </tr>
                    <tr className="bg-blue-50">
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-gray-900">Total Income</span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(report.summary.total_income)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">
                            {formatCurrency(report.previous_summary.total_income)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr>
                      <td className="py-2 px-4">
                        <span className="text-sm text-gray-700">Less: Cost of Goods Sold</span>
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-gray-700">
                        {formatCurrency(report.summary.total_cogs)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(report.previous_summary.total_cogs)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr className="bg-green-50 border-t border-b border-gray-200">
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-gray-900">Gross Profit</span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(report.summary.gross_profit)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">
                            {formatCurrency(report.previous_summary.gross_profit)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr>
                      <td className="py-2 px-4">
                        <span className="text-sm text-gray-700">Less: Operating Expenses</span>
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-gray-700">
                        {formatCurrency(report.summary.total_operating_expenses)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(report.previous_summary.total_operating_expenses)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr className="bg-blue-50 border-t border-b border-gray-200">
                      <td className="py-3 px-4">
                        <span className="text-sm font-semibold text-gray-900">
                          Operating Profit (EBIT)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(report.summary.operating_profit)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">
                            {formatCurrency(report.previous_summary.operating_profit)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr>
                      <td className="py-2 px-4">
                        <span className="text-sm text-gray-700">Add: Non-Operating Income</span>
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-gray-700">
                        {formatCurrency(report.summary.total_non_operating_income)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(report.previous_summary.total_non_operating_income)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr>
                      <td className="py-2 px-4">
                        <span className="text-sm text-gray-700">Less: Non-Operating Expenses</span>
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-gray-700">
                        {formatCurrency(report.summary.total_non_operating_expenses)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(report.previous_summary.total_non_operating_expenses)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr>
                      <td className="py-2 px-4">
                        <span className="text-sm text-gray-700">Less: Tax</span>
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-gray-700">
                        {formatCurrency(report.summary.tax)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-2 px-4 text-right text-sm text-gray-700">
                            {formatCurrency(report.previous_summary.tax)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                    <tr className="bg-green-100 border-t-2 border-gray-400">
                      <td className="py-4 px-4">
                        <span className="text-base font-bold text-gray-900">Net Profit</span>
                      </td>
                      <td className="py-4 px-4 text-right text-base font-bold text-gray-900">
                        {formatCurrency(report.summary.net_profit)}
                      </td>
                      {filters.comparison_type !== "none" && report.previous_summary && (
                        <>
                          <td className="py-4 px-4 text-right text-base font-bold text-gray-700">
                            {formatCurrency(report.previous_summary.net_profit)}
                          </td>
                          <td colSpan={2}></td>
                        </>
                      )}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


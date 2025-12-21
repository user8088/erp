"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, TrialBalanceReport } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function TrialBalancePage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");

  const [filters, setFilters] = useState<ReportFilters>({
    company_id: 1,
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
      const data = await financialReportsApi.getTrialBalance(filters);
      setReport(data);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to load Trial Balance.";
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
        <h1 className="text-2xl font-semibold text-gray-900">Trial Balance</h1>
        <p className="mt-1 text-sm text-gray-500">
          View all accounts and their debit/credit balances for the selected period.
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
                <h2 className="text-lg font-semibold text-gray-900">Trial Balance</h2>
                <p className="text-sm text-gray-600 mt-1">
                  As of: {new Date(filters.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {report.is_balanced ? (
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

          {/* Report Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Account Number
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Account Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Debit Balance
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Credit Balance
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Net Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line) => (
                  <tr
                    key={line.account_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {line.account_number || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">{line.account_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {line.root_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                      {line.debit_balance > 0 ? formatCurrency(line.debit_balance) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                      {line.credit_balance > 0 ? formatCurrency(line.credit_balance) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium">
                      <span
                        className={
                          line.net_balance > 0
                            ? "text-blue-600"
                            : line.net_balance < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }
                      >
                        {formatCurrency(Math.abs(line.net_balance))}
                        {line.net_balance > 0 ? " (Dr)" : line.net_balance < 0 ? " (Cr)" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Totals */}
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td colSpan={3} className="py-4 px-4 text-sm text-gray-900">
                    Total
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-900">
                    {formatCurrency(report.total_debit)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-900">
                    {formatCurrency(report.total_credit)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-900">
                    {formatCurrency(report.total_debit - report.total_credit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Total Debits</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(report.total_debit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Credits</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(report.total_credit)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Difference</div>
                <div
                  className={`text-lg font-semibold ${
                    report.is_balanced ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(Math.abs(report.total_debit - report.total_credit))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


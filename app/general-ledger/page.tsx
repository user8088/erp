"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "../components/User/UserContext";
import { financialReportsApi } from "../lib/apiClient";
import type { ReportFilters, GeneralLedgerLine, Paginated } from "../lib/types";
import ReportFiltersComponent from "../components/FinancialReports/ReportFilters";
import { useToast } from "../components/ui/ToastProvider";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function GeneralLedgerPage() {
  const { hasAtLeast } = useUser();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Paginated<GeneralLedgerLine> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 50;

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
      const data = await financialReportsApi.getGeneralLedger({
        ...filters,
        page,
        per_page: perPage,
      });
      setReport(data);
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Failed to load General Ledger.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [filters, page]);

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
        <h1 className="text-2xl font-semibold text-gray-900">General Ledger</h1>
        <p className="mt-1 text-sm text-gray-500">
          View all accounting transactions for the selected period.
        </p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          setPage(1); // Reset to first page when filters change
        }}
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
                <h2 className="text-lg font-semibold text-gray-900">General Ledger</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Period: {new Date(filters.start_date).toLocaleDateString()} -{" "}
                  {new Date(filters.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm text-gray-600">
                Showing {report.meta.current_page} of {report.meta.last_page} pages
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Voucher Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Reference
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Account
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Debit
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Credit
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                      No transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  report.data.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(line.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {line.voucher_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {line.reference_number || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          {line.account_number && (
                            <span className="text-xs text-gray-500">{line.account_number}</span>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {line.account_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {line.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium">
                        <span
                          className={
                            line.balance > 0
                              ? "text-blue-600"
                              : line.balance < 0
                                ? "text-red-600"
                                : "text-gray-600"
                          }
                        >
                          {formatCurrency(Math.abs(line.balance))}
                          {line.balance > 0 ? " (Dr)" : line.balance < 0 ? " (Cr)" : ""}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {report.meta.last_page > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((report.meta.current_page - 1) * report.meta.per_page) + 1} to{" "}
                  {Math.min(report.meta.current_page * report.meta.per_page, report.meta.total)} of{" "}
                  {report.meta.total} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={report.meta.current_page === 1 || loading}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {report.meta.current_page} of {report.meta.last_page}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(report.meta.last_page, p + 1))}
                    disabled={report.meta.current_page === report.meta.last_page || loading}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


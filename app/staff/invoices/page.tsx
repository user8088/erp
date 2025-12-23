"use client";

import { useState, useEffect, useCallback } from "react";
import { invoicesApi, ApiError } from "../../lib/apiClient";
import type { Invoice } from "../../lib/types";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getStatusBadge = (status: Invoice['status']) => {
  const styles = {
    draft: "bg-gray-100 text-gray-800",
    issued: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function StaffInvoicesPage() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoicePagination, setInvoicePagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  // Fetch staff invoices
  const fetchInvoices = useCallback(async (page = invoicePagination.current_page) => {
    setLoading(true);
    try {
      const response = await invoicesApi.getInvoices({
        invoice_type: 'staff',
        sort_by: 'invoice_date',
        sort_direction: 'desc',
        page: page,
        per_page: invoicePagination.per_page,
      });
      
      setInvoices(response.invoices || []);
      setInvoicePagination({
        current_page: response.pagination.current_page,
        last_page: response.pagination.last_page,
        per_page: response.pagination.per_page,
        total: response.pagination.total,
      });
    } catch (error) {
      console.error("Failed to fetch staff invoices:", error);
      if (error instanceof ApiError && error.status === 404) {
        // No invoices yet
        setInvoices([]);
        setInvoicePagination({
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: 0,
        });
      } else {
        addToast("Failed to load staff invoices", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [invoicePagination.per_page, addToast]);

  useEffect(() => {
    void fetchInvoices(1);
  }, []);

  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const blob = await invoicesApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Failed to open invoice preview:", error);
      addToast("Failed to open invoice", "error");
    }
  };

  const handleDownloadInvoice = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const blob = await invoicesApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Invoice downloaded successfully", "success");
    } catch (error) {
      console.error("Failed to download invoice:", error);
      addToast("Failed to download invoice", "error");
    }
  };

  // Extract staff info from invoice metadata
  const getStaffInfo = (invoice: Invoice) => {
    const metadata = invoice.metadata as { 
      staff?: { id: number; code?: string; full_name?: string; name?: string };
      month?: string;
    } | undefined;
    return metadata?.staff || null;
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Staff Invoices
        </h1>
        <p className="text-sm text-gray-600">
          View and manage all paid salary invoices for staff members.
        </p>
      </div>

      {loading && invoices.length === 0 ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-500">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-900 mb-1">No invoices found</p>
          <p className="text-xs text-gray-500">Staff invoices will appear here once salaries are paid</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => {
                    const staffInfo = getStaffInfo(invoice);
                    const month = (invoice.metadata as { month?: string } | undefined)?.month || '-';
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staffInfo?.full_name || staffInfo?.name || 'N/A'}
                          {staffInfo?.code && (
                            <span className="ml-2 text-xs text-gray-500">({staffInfo.code})</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          PKR {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {invoice.has_pdf && (
                              <>
                                <button
                                  onClick={() => handleViewInvoice(invoice.id)}
                                  className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                                  title="View Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                                  className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                                  title="Download Invoice"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {invoicePagination.last_page > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((invoicePagination.current_page - 1) * invoicePagination.per_page) + 1} to{" "}
                {Math.min(invoicePagination.current_page * invoicePagination.per_page, invoicePagination.total)} of{" "}
                {invoicePagination.total} invoices
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchInvoices(invoicePagination.current_page - 1)}
                  disabled={invoicePagination.current_page === 1 || loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchInvoices(invoicePagination.current_page + 1)}
                  disabled={invoicePagination.current_page === invoicePagination.last_page || loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


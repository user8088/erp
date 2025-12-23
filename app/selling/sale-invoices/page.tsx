"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { invoicesApi, customersApi, salesApi, customerPaymentsApi, ApiError } from "../../lib/apiClient";
import type { Invoice, Customer, Sale, SaleItem, CustomerPayment } from "../../lib/types";
import { FileText, Download, Eye, Filter, Store } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function SaleInvoicesPage() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceApiUnavailable, setInvoiceApiUnavailable] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [invoiceItemSummaries, setInvoiceItemSummaries] = useState<Record<number, string>>({});
  const [paymentNumbersMap, setPaymentNumbersMap] = useState<Record<number, string>>({});
  const fetchedSaleIdsRef = useRef<Set<number>>(new Set());
  const [invoicePagination, setInvoicePagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });
  const [invoiceFilters, setInvoiceFilters] = useState({
    invoice_type: 'sale' as 'sale' | '' | 'all',
    customer_id: '' as '' | number,
    status: '' as '' | 'draft' | 'issued' | 'paid' | 'cancelled',
    start_date: '',
    end_date: '',
    search: '',
  });

  // Format sale items for display
  const formatSaleItems = (saleItems: SaleItem[] | undefined | null): string => {
    if (!saleItems || saleItems.length === 0) return "";
    return saleItems
      .map((item) => {
        const quantity = Math.floor(item?.quantity ?? 0);
        const unit = item?.unit || item?.item?.primary_unit || 'units';
        const itemName = item?.item?.name ?? `Item #${item?.item_id ?? ""}`;
        return `${quantity} ${unit} of ${itemName}`;
      })
      .filter(Boolean)
      .join(", ");
  };

  // Fetch customers for filter dropdown
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await customersApi.getCustomers({
        per_page: 1000,
      });
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      addToast("Failed to load customers", "error");
    } finally {
      setLoadingCustomers(false);
    }
  }, [addToast]);

  // Fetch customer payments for invoices to get payment numbers
  const fetchPaymentNumbersForInvoices = useCallback(async (invoicesToProcess: Invoice[]) => {
    try {
      // Only fetch payments for paid invoices
      const paidInvoices = invoicesToProcess.filter(inv => inv.status === 'paid');
      if (paidInvoices.length === 0) return;

      // Get unique customer IDs
      const customerIds = new Set<number>();
      paidInvoices.forEach(invoice => {
        if (invoice.metadata?.customer?.id) {
          customerIds.add(invoice.metadata.customer.id);
        }
      });

      // Fetch payments for each customer
      const paymentMap: Record<number, string> = {};
      await Promise.all(
        Array.from(customerIds).map(async (customerId) => {
          try {
            const response = await customerPaymentsApi.getCustomerPayments({
              customer_id: customerId,
              per_page: 1000, // Get all payments
            });
            
            // Match payments to invoices by invoice_id
            response.data.forEach((payment: CustomerPayment) => {
              if (payment.invoice_id && payment.payment_number) {
                paymentMap[payment.invoice_id] = payment.payment_number;
              }
            });
          } catch (error) {
            console.error(`Failed to fetch payments for customer ${customerId}:`, error);
          }
        })
      );

      setPaymentNumbersMap(paymentMap);
    } catch (error) {
      console.error("Failed to fetch payment numbers:", error);
    }
  }, []);

  // Fetch sale items for invoices to show items sold
  const fetchSaleItemsForInvoices = useCallback(async (invoicesToProcess: Invoice[]) => {
    try {
      const saleInvoices = invoicesToProcess.filter(
        (invoice) => invoice.reference_type === "sale" || invoice.reference_id
      );

      const tasks = saleInvoices.map(async (invoice) => {
        // Try to derive saleId and items from metadata first
        const metadata = invoice.metadata as Record<string, unknown> | undefined;
        const metaSale: Sale | undefined = (metadata?.sale as Sale) ?? undefined;
        const metaItems: SaleItem[] | undefined =
          (metaSale?.items as SaleItem[] | undefined) ||
          (metadata?.items as SaleItem[] | undefined);
        const metaSaleId: number | undefined =
          (metadata?.sale_id as number | undefined) ??
          (metaSale?.id as number | undefined) ??
          (invoice.reference_id as number | undefined);

        // If items are already present in metadata, use them without fetching
        if (metaItems && metaItems.length > 0) {
          const summary = formatSaleItems(metaItems);
          if (summary) {
            setInvoiceItemSummaries((prev) => ({
              ...prev,
              [invoice.id]: summary,
            }));
          }
          if (metaSaleId) {
            fetchedSaleIdsRef.current.add(metaSaleId);
          }
          return;
        }

        // Otherwise fetch sale by id if available
        if (!metaSaleId || fetchedSaleIdsRef.current.has(metaSaleId)) return;

        fetchedSaleIdsRef.current.add(metaSaleId);
        try {
          const saleResponse = await salesApi.getSale(metaSaleId);
          const sale =
            (saleResponse as { sale?: Sale }).sale ??
            (saleResponse as unknown as Sale | undefined);
          const summary = formatSaleItems(sale?.items);
          if (summary) {
            setInvoiceItemSummaries((prev) => ({
              ...prev,
              [invoice.id]: summary,
            }));
          }
        } catch (error) {
          console.warn("Failed to fetch sale items for invoice", invoice.id, error);
        }
      });

      await Promise.all(tasks);
    } catch (error) {
      console.error("Failed to fetch sale items:", error);
    }
  }, []);

  // Helper function to get items sold for an invoice
  const getItemsSold = useCallback((invoice: Invoice): string => {
    // First check if we have it in the summaries
    if (invoiceItemSummaries[invoice.id]) {
      return invoiceItemSummaries[invoice.id];
    }

    // Try to get from metadata
    const metadata = invoice.metadata as Record<string, unknown> | undefined;
    const metaSale: Sale | undefined = (metadata?.sale as Sale) ?? undefined;
    const metaItems: SaleItem[] | undefined =
      (metaSale?.items as SaleItem[] | undefined) ||
      (metadata?.items as SaleItem[] | undefined);

    if (metaItems && metaItems.length > 0) {
      return formatSaleItems(metaItems);
    }

    return "";
  }, [invoiceItemSummaries]);

  // Fetch sale invoices
  const fetchInvoices = useCallback(async (page = invoicePagination.current_page) => {
    setLoadingInvoices(true);
    try {
      // Fetch sale invoices
      const response = await invoicesApi.getInvoices({
        invoice_type: 'sale',
        status: invoiceFilters.status || undefined,
        start_date: invoiceFilters.start_date || undefined,
        end_date: invoiceFilters.end_date || undefined,
        search: invoiceFilters.search || undefined,
        sort_by: 'invoice_date',
        sort_direction: 'desc',
        page: page,
        per_page: invoicePagination.per_page,
      });

      let filteredInvoices = response.invoices;

      // Filter by customer ID if selected
      if (invoiceFilters.customer_id) {
        filteredInvoices = filteredInvoices.filter(invoice => 
          invoice.metadata?.customer?.id === invoiceFilters.customer_id
        );
      }

      // Sort by date (newest first); if dates are equal, use invoice id (newest id first)
      filteredInvoices.sort((a, b) => {
        const dateDiff =
          new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.id ?? 0) - (a.id ?? 0);
      });

      setInvoices(filteredInvoices);
      // Fetch sale items for invoices to show items sold
      await fetchSaleItemsForInvoices(filteredInvoices);
      // Fetch payment numbers for paid invoices
      await fetchPaymentNumbersForInvoices(filteredInvoices);
      setInvoicePagination({
        current_page: page,
        per_page: invoicePagination.per_page,
        total: response.pagination.total || filteredInvoices.length,
        last_page: response.pagination.last_page || Math.ceil(filteredInvoices.length / invoicePagination.per_page),
      });
      setInvoiceApiUnavailable(false);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      
      if (error instanceof ApiError && error.status === 404) {
        setInvoiceApiUnavailable(true);
      } else {
        addToast("Failed to load invoices", "error");
      }
      
      setInvoices([]);
      setInvoicePagination({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
      });
    } finally {
      setLoadingInvoices(false);
    }
  }, [invoiceFilters.status, invoiceFilters.start_date, invoiceFilters.end_date, invoiceFilters.search, invoiceFilters.customer_id, invoicePagination.per_page, addToast, fetchSaleItemsForInvoices, fetchPaymentNumbersForInvoices]);

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch invoices on mount and when filters change
  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  // Refetch invoices when filters change (skip on initial mount to avoid double fetch)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    setInvoicePagination(prev => ({ ...prev, current_page: 1 }));
    fetchInvoices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceFilters.status, invoiceFilters.start_date, invoiceFilters.end_date, invoiceFilters.search, invoiceFilters.customer_id]);

  return (
    <div className="max-w-full mx-auto min-h-full">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Sale Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all sale invoices including customer invoices</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Type</label>
              <select
                value={invoiceFilters.invoice_type}
                onChange={(e) => {
                  setInvoiceFilters({ ...invoiceFilters, invoice_type: e.target.value as 'sale' | '' | 'all' });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Types</option>
                <option value="sale">Sale Invoices</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={invoiceFilters.customer_id}
                onChange={(e) => {
                  setInvoiceFilters({ ...invoiceFilters, customer_id: e.target.value ? Number(e.target.value) : '' });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loadingCustomers}
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={invoiceFilters.status}
                onChange={(e) => {
                  setInvoiceFilters({ ...invoiceFilters, status: e.target.value as '' | 'draft' | 'issued' | 'paid' | 'cancelled' });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={invoiceFilters.start_date}
                onChange={(e) => {
                  setInvoiceFilters({ ...invoiceFilters, start_date: e.target.value });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={invoiceFilters.search}
                onChange={(e) => {
                  setInvoiceFilters({ ...invoiceFilters, search: e.target.value });
                }}
                placeholder="Invoice number..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={invoiceFilters.end_date}
              onChange={(e) => {
                setInvoiceFilters({ ...invoiceFilters, end_date: e.target.value });
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Invoice Table */}
        {loadingInvoices ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">Loading invoices...</p>
          </div>
        ) : invoices.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items Sold</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => {
                    const itemsSold = getItemsSold(invoice);
                    // Check multiple possible locations for payment number
                    const paymentNumber = 
                      invoice.reference?.payment_number || 
                      invoice.metadata?.payment?.payment_number ||
                      paymentNumbersMap[invoice.id] ||
                      null;
                    const saleType = invoice.metadata?.sale_type || 'walk-in';
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            saleType === 'walk-in' ? 'bg-purple-100 text-purple-800' :
                            saleType === 'delivery' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {saleType === 'walk-in' ? 'Walk-in Sale' : saleType === 'delivery' ? 'Delivery Sale' : 'Sale'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {invoice.metadata?.customer?.name || (
                            <span className="text-gray-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {paymentNumber || (
                            <span className="text-gray-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="max-w-xs">
                            {(() => {
                              if (itemsSold) {
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-medium text-gray-700">Items Sold:</span>
                                    <span className="text-xs text-gray-600 leading-relaxed">{itemsSold}</span>
                                  </div>
                                );
                              }
                              
                              return invoice.notes ? (
                                <span className="text-xs text-gray-500 line-clamp-2">{invoice.notes}</span>
                              ) : (
                                <span className="text-gray-400 italic text-xs">No details</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            invoice.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          PKR {Number(invoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          PKR {Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const blob = await invoicesApi.downloadInvoice(invoice.id);
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${invoice.invoice_number}.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                  addToast("Invoice downloaded successfully", "success");
                                } catch (error) {
                                  console.error("Failed to download invoice:", error);
                                  addToast("Failed to download invoice", "error");
                                }
                              }}
                              className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const blob = await invoicesApi.downloadInvoice(invoice.id);
                                  const url = window.URL.createObjectURL(blob);
                                  window.open(url, "_blank");
                                } catch (error) {
                                  console.error("Failed to open invoice preview:", error);
                                  addToast("Failed to open invoice", "error");
                                }
                              }}
                              className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="View PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoicePagination.last_page > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {invoicePagination.current_page} of {invoicePagination.last_page} 
                  ({invoicePagination.total} total invoices)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newPage = invoicePagination.current_page - 1;
                      fetchInvoices(newPage);
                    }}
                    disabled={invoicePagination.current_page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const newPage = invoicePagination.current_page + 1;
                      fetchInvoices(newPage);
                    }}
                    disabled={invoicePagination.current_page === invoicePagination.last_page}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : invoiceApiUnavailable ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Invoice API Not Available</p>
            <p className="text-xs mt-2 text-gray-500 max-w-md mx-auto">
              The invoice API endpoint is not available. Please ensure the backend is running 
              and the <code className="bg-gray-100 px-1 rounded text-gray-700">/api/invoices</code> route is implemented.
            </p>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm">No invoices found.</p>
            <p className="text-xs mt-1 text-gray-400">
              {invoiceFilters.customer_id 
                ? "No invoices found for the selected customer."
                : "Invoices will appear here when sales are processed."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

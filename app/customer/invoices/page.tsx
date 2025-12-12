"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { invoicesApi, customersApi, salesApi, ApiError } from "../../lib/apiClient";
import type { Invoice, Customer, Sale, SaleItem } from "../../lib/types";
import { FileText, Download, Eye, Filter } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function CustomerInvoicesPage() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceApiUnavailable, setInvoiceApiUnavailable] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [invoiceItemSummaries, setInvoiceItemSummaries] = useState<Record<number, string>>({});
  const fetchedSaleIdsRef = useRef<Set<number>>(new Set());
  const [invoicePagination, setInvoicePagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });
  const [invoiceFilters, setInvoiceFilters] = useState({
    customer_id: '' as '' | number,
    invoice_type: '' as '' | 'walk-in' | 'delivery' | 'all',
    status: '' as '' | 'draft' | 'issued' | 'paid' | 'cancelled',
    start_date: '',
    end_date: '',
    search: '',
  });

  const formatSaleItems = (saleItems: SaleItem[] | undefined | null): string => {
    if (!saleItems || saleItems.length === 0) return "";
    return saleItems
      .map((item) => {
        const name = item?.item?.name ?? `Item #${item?.item_id ?? ""}`.trim();
        const unit = item?.unit ? ` ${item.unit}` : "";
        const qty = item?.quantity ?? 0;
        return `${qty}${unit} ${name}`.trim();
      })
      .filter(Boolean)
      .join(", ");
  };

  const fetchSaleItemsForInvoices = useCallback(async (fetchedInvoices: Invoice[]) => {
    const saleInvoices = fetchedInvoices.filter(
      (invoice) => invoice.reference_type === "sale" || invoice.reference_id
    );

    const tasks = saleInvoices.map(async (invoice) => {
      const metadata = invoice.metadata as Record<string, unknown> | undefined;
      const metaSale: Sale | undefined = (metadata?.sale as Sale) ?? undefined;
      const metaItems: SaleItem[] | undefined =
        (metaSale?.items as SaleItem[] | undefined) ||
        (metadata?.items as SaleItem[] | undefined);
      const metaSaleId: number | undefined =
        (metadata?.sale_id as number | undefined) ??
        (metaSale?.id as number | undefined) ??
        (invoice.reference_id as number | undefined);

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
  }, []);

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

  // Fetch customer invoices
  const fetchInvoices = useCallback(async (page = invoicePagination.current_page) => {
    setLoadingInvoices(true);
    try {
      // Fetch sale invoices (which include walk-in and delivery sale invoices)
      const invoiceTypes: ('sale' | 'payment')[] = ['sale'];
      
      const allInvoices: Invoice[] = [];
      for (const invoiceType of invoiceTypes) {
        try {
          const response = await invoicesApi.getInvoices({
            invoice_type: invoiceType,
            status: invoiceFilters.status || undefined,
            start_date: invoiceFilters.start_date || undefined,
            end_date: invoiceFilters.end_date || undefined,
            search: invoiceFilters.search || undefined,
            sort_by: 'invoice_date',
            sort_direction: 'desc',
            page: page,
            per_page: invoicePagination.per_page,
          });
          allInvoices.push(...response.invoices);
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            console.log("Sale invoice type not available yet");
          } else {
            throw error;
          }
        }
      }

      // Filter by customer ID if selected
      let filteredInvoices = allInvoices;
      if (invoiceFilters.customer_id) {
        filteredInvoices = allInvoices.filter(invoice => 
          invoice.metadata?.customer?.id === invoiceFilters.customer_id
        );
      }

      // Filter by invoice type (walk-in vs delivery) if selected
      if (invoiceFilters.invoice_type && invoiceFilters.invoice_type !== 'all') {
        // This will be determined by metadata or reference_type when backend is implemented
        // For now, we'll just show all sale invoices
      }

      // Sort by date (newest first)
      filteredInvoices.sort((a, b) => {
        const dateA = new Date(a.invoice_date).getTime();
        const dateB = new Date(b.invoice_date).getTime();
        return dateB - dateA;
      });

      setInvoices(filteredInvoices);
      fetchSaleItemsForInvoices(filteredInvoices);
      setInvoicePagination({
        current_page: page,
        per_page: invoicePagination.per_page,
        total: filteredInvoices.length,
        last_page: Math.ceil(filteredInvoices.length / invoicePagination.per_page),
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
  }, [invoiceFilters.status, invoiceFilters.start_date, invoiceFilters.end_date, invoiceFilters.search, invoiceFilters.customer_id, invoiceFilters.invoice_type, invoicePagination.per_page, addToast, fetchSaleItemsForInvoices]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handlePageChange = (newPage: number) => {
    setInvoicePagination(prev => ({ ...prev, current_page: newPage }));
    fetchInvoices(newPage);
  };

  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      const blob = await invoicesApi.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
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

  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const viewUrl = await invoicesApi.getInvoiceViewUrl(invoiceId);
      window.open(viewUrl, '_blank');
    } catch (error) {
      console.error("Failed to get invoice view URL:", error);
      addToast("Failed to open invoice", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
      issued: { label: "Issued", color: "bg-blue-100 text-blue-700" },
      paid: { label: "Paid", color: "bg-green-100 text-green-700" },
      cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getInvoiceTypeBadge = (invoice: Invoice) => {
    // Determine invoice type from metadata or reference_type
    // For now, we'll use a placeholder - backend will provide this
    const type = invoice.metadata?.sale_type || 'walk-in';
    const typeConfig = {
      'walk-in': { label: "Walk-in Sale", color: "bg-purple-100 text-purple-700" },
      'delivery': { label: "Delivery Sale", color: "bg-indigo-100 text-indigo-700" },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig['walk-in'];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Customer Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage all customer invoices from sales</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-medium text-gray-700">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Type</label>
            <select
              value={invoiceFilters.invoice_type}
              onChange={(e) => setInvoiceFilters({ ...invoiceFilters, invoice_type: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Types</option>
              <option value="all">All Sale Types</option>
              <option value="walk-in">Walk-in Sale</option>
              <option value="delivery">Delivery Sale</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={invoiceFilters.customer_id || ''}
              onChange={(e) => setInvoiceFilters({ ...invoiceFilters, customer_id: e.target.value ? Number(e.target.value) : '' })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loadingCustomers}
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.serial_number ? `(${customer.serial_number})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={invoiceFilters.status}
              onChange={(e) => setInvoiceFilters({ ...invoiceFilters, status: e.target.value as any })}
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
              onChange={(e) => setInvoiceFilters({ ...invoiceFilters, start_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={invoiceFilters.end_date}
              onChange={(e) => setInvoiceFilters({ ...invoiceFilters, end_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={invoiceFilters.search}
            onChange={(e) => setInvoiceFilters({ ...invoiceFilters, search: e.target.value })}
            placeholder="Search by invoice number, customer name..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Invoice Table */}
      {loadingInvoices ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">Loading invoices...</p>
        </div>
      ) : invoiceApiUnavailable ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">Customer Invoices API Not Available</p>
          <p className="text-xs text-gray-500">
            The backend endpoint for customer invoices has not been implemented yet.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Please implement the customer invoices API endpoint to view invoices here.
          </p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No invoices found</p>
          <p className="text-xs text-gray-500">
            {invoiceFilters.customer_id || invoiceFilters.status || invoiceFilters.start_date || invoiceFilters.search
              ? "Try adjusting your filters to see more results."
              : "Customer invoices will appear here once sales are processed."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                        {invoiceItemSummaries[invoice.id] && (
                          <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                            Items: {invoiceItemSummaries[invoice.id]}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getInvoiceTypeBadge(invoice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.metadata?.customer?.name || 'Unknown Customer'}
                        </div>
                        {invoice.metadata?.customer?.serial_number && (
                          <div className="text-xs text-gray-500">
                            {invoice.metadata.customer.serial_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          PKR {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
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
                                onClick={() => handleDownloadInvoice(invoice.id)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {invoicePagination.last_page > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {invoicePagination.current_page} of {invoicePagination.last_page}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(invoicePagination.current_page - 1)}
                  disabled={invoicePagination.current_page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(invoicePagination.current_page + 1)}
                  disabled={invoicePagination.current_page === invoicePagination.last_page}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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


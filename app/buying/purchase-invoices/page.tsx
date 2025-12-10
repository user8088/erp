"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { invoicesApi, suppliersApi, purchaseOrdersApi, ApiError } from "../../lib/apiClient";
import type { Invoice, Supplier, PurchaseOrder } from "../../lib/types";
import { FileText, Download, Eye, Filter, ShoppingCart } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function PurchaseInvoicesPage() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceApiUnavailable, setInvoiceApiUnavailable] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [purchaseOrdersMap, setPurchaseOrdersMap] = useState<Map<number, PurchaseOrder[]>>(new Map());
  const [invoicePagination, setInvoicePagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });
  const [invoiceFilters, setInvoiceFilters] = useState({
    invoice_type: 'supplier' as 'supplier' | 'purchase' | '' | 'all',
    supplier_id: '' as '' | number,
    status: '' as '' | 'draft' | 'issued' | 'paid' | 'cancelled',
    start_date: '',
    end_date: '',
    search: '',
  });

  // Fetch suppliers for filter dropdown
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const response = await suppliersApi.getSuppliers({
        per_page: 1000,
        status: 'active',
        sort_by: 'name',
        sort_order: 'asc',
      });
      setSuppliers(response.data);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      addToast("Failed to load suppliers", "error");
    } finally {
      setLoadingSuppliers(false);
    }
  }, [addToast]);

  // Fetch purchase invoices (supplier and purchase types)
  const fetchInvoices = useCallback(async (page = invoicePagination.current_page) => {
    setLoadingInvoices(true);
    try {
      // Fetch supplier invoices (and purchase invoices if they exist)
      const invoiceTypes: ('supplier' | 'purchase')[] = [];
      if (invoiceFilters.invoice_type === 'all' || invoiceFilters.invoice_type === '') {
        invoiceTypes.push('supplier', 'purchase');
      } else if (invoiceFilters.invoice_type === 'supplier' || invoiceFilters.invoice_type === 'purchase') {
        invoiceTypes.push(invoiceFilters.invoice_type);
      }

      // Fetch invoices for each type
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
          // If purchase invoice type doesn't exist yet, that's okay
          if (invoiceType === 'purchase' && error instanceof ApiError && error.status === 404) {
            console.log("Purchase invoice type not available yet");
          } else {
            throw error;
          }
        }
      }

      // Filter by supplier ID if selected
      let filteredInvoices = allInvoices;
      if (invoiceFilters.supplier_id) {
        filteredInvoices = allInvoices.filter(invoice => 
          invoice.metadata?.supplier?.id === invoiceFilters.supplier_id
        );
      }

      // Sort by date (newest first)
      filteredInvoices.sort((a, b) => {
        return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
      });

      setInvoices(filteredInvoices);
      // Update pagination (approximate since we're combining multiple types)
      setInvoicePagination({
        current_page: page,
        per_page: invoicePagination.per_page,
        total: filteredInvoices.length,
        last_page: Math.ceil(filteredInvoices.length / invoicePagination.per_page),
      });
      setInvoiceApiUnavailable(false);

      // Fetch purchase orders for suppliers to show items purchased
      await fetchPurchaseOrdersForInvoices(filteredInvoices);
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
  }, [invoiceFilters.status, invoiceFilters.start_date, invoiceFilters.end_date, invoiceFilters.search, invoiceFilters.supplier_id, invoiceFilters.invoice_type, invoicePagination.per_page, addToast]);

  // Fetch purchase orders for invoices to show items purchased
  const fetchPurchaseOrdersForInvoices = useCallback(async (invoicesToProcess: Invoice[]) => {
    try {
      // Get unique supplier IDs from invoices
      const supplierIds = new Set<number>();
      invoicesToProcess.forEach(invoice => {
        if (invoice.metadata?.supplier?.id) {
          supplierIds.add(invoice.metadata.supplier.id);
        }
      });

      // Fetch purchase orders for each supplier
      const poMap = new Map<number, PurchaseOrder[]>();
      await Promise.all(
        Array.from(supplierIds).map(async (supplierId) => {
          try {
            const response = await purchaseOrdersApi.getPurchaseOrders({
              supplier_id: supplierId,
              per_page: 100,
              sort_by: 'order_date',
              sort_order: 'desc',
            });
            poMap.set(supplierId, response.data);
          } catch (error) {
            console.error(`Failed to fetch purchase orders for supplier ${supplierId}:`, error);
          }
        })
      );

      setPurchaseOrdersMap(poMap);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    }
  }, []);

  // Helper function to get items purchased for an invoice
  const getItemsPurchased = useCallback((invoice: Invoice): string => {
    const supplierId = invoice.metadata?.supplier?.id;
    if (!supplierId) return "";

    const purchaseOrders = purchaseOrdersMap.get(supplierId) || [];
    
    // Find the purchase order that best matches this invoice
    // We'll match by: same supplier, date close to invoice date, and similar total amount
    const invoiceDate = new Date(invoice.invoice_date);
    const invoiceTotal = invoice.total_amount;
    
    // Find purchase orders within 30 days before invoice date
    const candidatePOs = purchaseOrders
      .map(po => {
        const poDate = new Date(po.order_date);
        const daysDiff = (invoiceDate.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24);
        const amountDiff = Math.abs(po.total - invoiceTotal);
        return {
          po,
          daysDiff,
          amountDiff,
          score: daysDiff <= 30 && daysDiff >= 0 ? (30 - daysDiff) - (amountDiff / 1000) : -1
        };
      })
      .filter(candidate => candidate.score >= 0)
      .sort((a, b) => b.score - a.score); // Sort by best match
    
    // Use only the best matching purchase order (most recent and closest amount)
    const bestMatch = candidatePOs[0];
    if (!bestMatch || !bestMatch.po.items || bestMatch.po.items.length === 0) {
      return "";
    }

    // Collect items from the best matching purchase order only
    const items: string[] = [];
    bestMatch.po.items.forEach(item => {
      const quantity = Math.floor(item.quantity_ordered);
      const unit = item.item?.primary_unit || 'units';
      const itemName = item.item?.name || `Item #${item.item_id}`;
      items.push(`${quantity} ${unit} of ${itemName}`);
    });

    return items.length > 0 ? items.join(", ") : "";
  }, [purchaseOrdersMap]);

  // Fetch suppliers on mount
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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
  }, [invoiceFilters.status, invoiceFilters.start_date, invoiceFilters.end_date, invoiceFilters.search, invoiceFilters.supplier_id, invoiceFilters.invoice_type]);

  return (
    <div className="max-w-full mx-auto min-h-full">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Purchase Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all purchase invoices including supplier invoices</p>
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
                  setInvoiceFilters({ ...invoiceFilters, invoice_type: e.target.value as 'supplier' | 'purchase' | '' | 'all' });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Types</option>
                <option value="supplier">Supplier Invoices</option>
                <option value="purchase">Purchase Invoices</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={invoiceFilters.supplier_id}
                onChange={(e) => {
                  setInvoiceFilters({ ...invoiceFilters, supplier_id: e.target.value ? Number(e.target.value) : '' });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loadingSuppliers}
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Supplier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items Purchased</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          invoice.invoice_type === 'supplier' ? 'bg-blue-100 text-blue-800' :
                          invoice.invoice_type === 'purchase' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.type_label || invoice.invoice_type.charAt(0).toUpperCase() + invoice.invoice_type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {invoice.metadata?.supplier?.name || (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {invoice.metadata?.payment?.payment_number || (
                          <span className="text-gray-400 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="max-w-xs">
                          {(() => {
                            const itemsPurchased = getItemsPurchased(invoice);
                            const supplierInvoice = invoice.metadata?.payment?.invoice_number;
                            
                            if (supplierInvoice || itemsPurchased) {
                              return (
                                <div className="flex flex-col gap-1.5">
                                  {supplierInvoice && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-medium text-gray-700">Supplier Invoice:</span>
                                      <span className="text-xs font-semibold text-gray-900">{supplierInvoice}</span>
                                    </div>
                                  )}
                                  {itemsPurchased && (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-medium text-gray-700">Items Purchased:</span>
                                      <span className="text-xs text-gray-600 leading-relaxed">{itemsPurchased}</span>
                                    </div>
                                  )}
                                  {invoice.notes && !supplierInvoice && !itemsPurchased && (
                                    <span className="text-xs text-gray-500 line-clamp-2">{invoice.notes}</span>
                                  )}
                                  {invoice.metadata?.payment?.notes && !supplierInvoice && !itemsPurchased && (
                                    <span className="text-xs text-gray-500 line-clamp-2">{invoice.metadata.payment.notes}</span>
                                  )}
                                </div>
                              );
                            }
                            
                            return invoice.notes ? (
                              <span className="text-xs text-gray-500 line-clamp-2">{invoice.notes}</span>
                            ) : invoice.metadata?.payment?.notes ? (
                              <span className="text-xs text-gray-500 line-clamp-2">{invoice.metadata.payment.notes}</span>
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
                          <a
                            href={invoicesApi.getInvoiceViewUrl(invoice.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="View PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm">No invoices found.</p>
            <p className="text-xs mt-1 text-gray-400">
              {invoiceFilters.supplier_id 
                ? "No invoices found for the selected supplier."
                : invoiceFilters.invoice_type && invoiceFilters.invoice_type !== 'all'
                ? `No ${invoiceFilters.invoice_type} invoices found.`
                : "Invoices will appear here when payments are made or purchase invoices are created."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


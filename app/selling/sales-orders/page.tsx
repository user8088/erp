"use client";

import { useState, useEffect, useCallback } from "react";
import { salesApi, customersApi, ApiError } from "../../lib/apiClient";
import type { Sale, Customer } from "../../lib/types";
import { useToast } from "../../components/ui/ToastProvider";
import { Search, Truck, CheckCircle2, Loader2, Trash2, Ban } from "lucide-react";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getStatusBadge = (sale: Sale) => {
  // For delivery sales in draft status, show "Pending Delivery"
  if (sale.sale_type === 'delivery' && sale.status === 'draft') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
        Pending Delivery
      </span>
    );
  }

  const styles = {
    draft: "bg-gray-100 text-gray-800 border-gray-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    draft: "Draft",
    completed: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[sale.status]}`}>
      {labels[sale.status]}
    </span>
  );
};

const getPaymentStatusBadge = (status: Sale['payment_status']) => {
  const styles = {
    paid: "bg-green-100 text-green-800",
    unpaid: "bg-red-100 text-red-800",
    partial: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status === 'paid' ? 'Paid' : status === 'unpaid' ? 'Unpaid' : 'Partial'}
    </span>
  );
};

export default function SalesOrdersPage() {
  const { addToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });
  const [filters, setFilters] = useState({
    customer_id: '' as '' | number,
    status: '' as '' | 'draft' | 'completed' | 'cancelled',
    payment_status: '' as '' | 'paid' | 'unpaid' | 'partial',
    start_date: '',
    end_date: '',
    search: '',
  });
  const [markingDelivered, setMarkingDelivered] = useState<number | null>(null);
  const [cancellingSale, setCancellingSale] = useState<number | null>(null);
  const [deletingSale, setDeletingSale] = useState<number | null>(null);

  // Fetch customers for filter dropdown
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await customersApi.getCustomers({
        per_page: 1000,
      });
      // Filter out guest customers
      const filteredCustomers = response.data.filter(
        customer => !customer.serial_number?.toUpperCase().startsWith("GUEST")
      );
      setCustomers(filteredCustomers);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Fetch sales orders (only delivery type)
  const fetchSalesOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await salesApi.getSales({
        sale_type: 'delivery', // Only delivery sales
        page: pagination.current_page,
        per_page: pagination.per_page,
        customer_id: filters.customer_id || undefined,
        status: filters.status || undefined,
        payment_status: filters.payment_status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        search: filters.search || undefined,
      });

      setSales(response.data);
      setPagination({
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      });
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
      if (error instanceof ApiError && error.status === 404) {
        // API not available yet
        setSales([]);
      } else {
        addToast("Failed to load sales orders", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.current_page, pagination.per_page, filters, addToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  // Delete sale
  const handleDeleteSale = async (saleId: number) => {
    if (!confirm("Are you sure you want to delete this sale order? This action cannot be undone.")) {
      return;
    }

    setDeletingSale(saleId);
    try {
      await salesApi.deleteSale(saleId);
      addToast("Sale order deleted successfully", "success");
      await fetchSalesOrders(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete sale:", error);
      
      if (error instanceof ApiError) {
        // Handle validation errors (422) with field-specific messages
        if (error.status === 422 || error.status === 400) {
          const errorData = error.data as { message?: string; errors?: Record<string, string[]> };
          
          if (errorData.errors) {
            // Show all validation errors
            const errorMessages = Object.values(errorData.errors).flat();
            if (errorMessages.length > 0) {
              addToast(errorMessages[0], "error");
              if (errorMessages.length > 1) {
                console.warn("Additional validation errors:", errorMessages.slice(1));
              }
            } else {
              addToast(errorData.message || "Validation failed", "error");
            }
          } else {
            // Business logic error
            addToast(errorData.message || "Failed to delete sale order", "error");
          }
        } else if (error.status === 404) {
          addToast("Sale order not found", "error");
        } else if (error.status === 403) {
          addToast("You don't have permission to delete sales", "error");
        } else if (error.status === 401) {
          addToast("Please log in to continue", "error");
        } else {
          addToast(error.message || "Failed to delete sale order", "error");
        }
      } else {
        addToast("Failed to delete sale order. Please try again.", "error");
      }
    } finally {
      setDeletingSale(null);
    }
  };

  // Mark sale as delivered
  const handleMarkAsDelivered = async (saleId: number) => {
    if (!confirm("Mark this sale order as delivered? This will create an invoice.")) {
      return;
    }

    setMarkingDelivered(saleId);
    try {
      const response = await salesApi.markAsDelivered(saleId);
      
      // Success - show message from backend
      addToast(
        response.message || `Sale order marked as delivered! Invoice ${response.invoice.invoice_number || `Invoice #${response.invoice.id}`} created.`,
        "success"
      );
      await fetchSalesOrders(); // Refresh the list
    } catch (error) {
      console.error("Failed to mark sale as delivered:", error);
      
      if (error instanceof ApiError) {
        // Handle validation errors (422) with field-specific messages
        if (error.status === 422 || error.status === 400) {
          const errorData = error.data as { message?: string; errors?: Record<string, string[]> };
          
          if (errorData.errors) {
            // Show all validation errors
            const errorMessages = Object.values(errorData.errors).flat();
            if (errorMessages.length > 0) {
              addToast(errorMessages[0], "error");
              if (errorMessages.length > 1) {
                console.warn("Additional validation errors:", errorMessages.slice(1));
              }
            } else {
              addToast(errorData.message || "Validation failed", "error");
            }
          } else {
            // Business logic error (e.g., "Sale is already marked as delivered")
            addToast(errorData.message || "Failed to mark sale as delivered", "error");
          }
        } else if (error.status === 404) {
          addToast("Sale order not found", "error");
        } else if (error.status === 403) {
          addToast("You don't have permission to mark sales as delivered", "error");
        } else if (error.status === 401) {
          addToast("Please log in to continue", "error");
        } else {
          addToast(error.message || "Failed to mark sale as delivered", "error");
        }
      } else {
        addToast("Failed to mark sale as delivered. Please try again.", "error");
      }
    } finally {
      setMarkingDelivered(null);
    }
  };

  // Cancel sale
  const handleCancelSale = async (saleId: number) => {
    if (!confirm("Are you sure you want to cancel this order? This will reverse any stock deductions and void the sale.")) {
      return;
    }

    setCancellingSale(saleId);
    try {
      await salesApi.cancelSale(saleId);
      addToast("Order cancelled successfully", "success");
      await fetchSalesOrders(); // Refresh the list
    } catch (error) {
      console.error("Failed to cancel order:", error);
      if (error instanceof ApiError) {
        addToast(error.message || "Failed to cancel order", "error");
      } else {
        addToast("Failed to cancel order", "error");
      }
    } finally {
      setCancellingSale(null);
    }
  };

  // Format items display
  const formatItems = (sale: Sale) => {
    if (!sale.items || sale.items.length === 0) return '—';
    
    return sale.items.map((item) => {
      const quantity = Math.floor(Number(item.quantity) || 0);
      const unit = item.unit || 'units';
      const itemName = item.item?.name || `Item #${item.item_id}`;
      return `${quantity} ${unit} ${itemName}`;
    }).join(', ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sales Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Manage delivery sales and mark them as delivered</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by sale number or customer..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={filters.customer_id || ""}
              onChange={(e) => setFilters({ ...filters, customer_id: e.target.value ? Number(e.target.value) : '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as '' | 'draft' | 'completed' | 'cancelled' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="completed">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters({ ...filters, payment_status: e.target.value as '' | 'paid' | 'unpaid' | 'partial' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          {/* Date Filters */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
            <p className="text-sm">Loading sales orders...</p>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">No sales orders found</p>
            <p className="text-xs text-gray-400">
              {filters.search || filters.customer_id || filters.status
                ? "Try adjusting your filters"
                : "Sales orders will appear here once delivery sales are created"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected Delivery
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {sale.sale_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {sale.customer?.name || `Customer #${sale.customer_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(sale.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {sale.expected_delivery_date ? formatDate(sale.expected_delivery_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={formatItems(sale)}>
                        {formatItems(sale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(sale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getPaymentStatusBadge(sale.payment_status)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap text-right">
                        PKR {sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {sale.status === 'completed' ? (
                            <span className="text-xs text-green-600 font-medium">Delivered</span>
                          ) : sale.status === 'cancelled' ? (
                            <span className="text-xs text-red-600 font-medium">Cancelled</span>
                          ) : sale.sale_type === 'delivery' && sale.status === 'draft' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsDelivered(sale.id);
                              }}
                              disabled={markingDelivered === sale.id || deletingSale === sale.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {markingDelivered === sale.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Mark as Delivered
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                          
                          {/* Cancel Button - Only for draft or unpaid orders that aren't already cancelled */}
                          {(sale.status === 'draft' || (sale.status === 'completed' && sale.payment_status === 'unpaid')) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelSale(sale.id);
                              }}
                              disabled={cancellingSale === sale.id || markingDelivered === sale.id || deletingSale === sale.id}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                              title="Cancel Order"
                            >
                              {cancellingSale === sale.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSale(sale.id);
                            }}
                            disabled={deletingSale === sale.id || markingDelivered === sale.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Delete sale order"
                          >
                            {deletingSale === sale.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{" "}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{" "}
                  {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {pagination.current_page} of {pagination.last_page}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
                    disabled={pagination.current_page >= pagination.last_page}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


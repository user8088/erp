"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck, TrendingUp, DollarSign, RefreshCw, ExternalLink, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { salesApi } from "../../lib/apiClient";
import type { Sale } from "../../lib/types";

interface CustomerDeliveryProfitProps {
  customerId: number;
}

export default function CustomerDeliveryProfit({ customerId }: CustomerDeliveryProfitProps) {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi.getSales({
        customer_id: customerId,
        sale_type: "delivery",
        page,
        per_page: perPage,
      });
      setSales(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      console.error("Failed to load delivery sales:", e);
      setError("Failed to load delivery sales.");
    } finally {
      setLoading(false);
    }
  }, [customerId, page, perPage]);

  useEffect(() => {
    if (customerId) {
      void fetchSales();
    }
  }, [customerId, fetchSales]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString();
  };

  // Calculate summary statistics
  const totalDeliveryCharges = sales.reduce((sum, sale) => sum + (Number(sale.total_delivery_charges) || 0), 0);
  const totalMaintenanceCosts = sales.reduce((sum, sale) => sum + (Number(sale.maintenance_cost) || 0), 0);
  const netProfit = totalDeliveryCharges - totalMaintenanceCosts;
  const profitMargin = totalDeliveryCharges > 0 
    ? ((netProfit / totalDeliveryCharges) * 100) 
    : 0;
  const totalOrders = sales.length;

  const lastPage = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const handleViewSale = (sale: Sale) => {
    router.push(`/selling/sale-invoices?search=${sale.sale_number}`);
  };

  const handleViewAllSales = () => {
    router.push(`/selling/sale-invoices?customer_id=${customerId}&sale_type=delivery`);
  };

  if (loading && sales.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-500">Loading delivery profit data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => void fetchSales()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Profit</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track profit from delivery charges for this customer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchSales()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleViewAllSales}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View All Sales
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-blue-900">{totalOrders}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Delivery Charges</p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(totalDeliveryCharges)}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-xs font-medium text-orange-700 mb-1">Maintenance Costs</p>
          <p className="text-2xl font-bold text-orange-900">
            {formatCurrency(totalMaintenanceCosts)}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs font-medium text-purple-700 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-purple-900' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-medium text-indigo-700 mb-1">Profit Margin</p>
          <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
            {profitMargin.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Charges
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Maintenance Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
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
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">No delivery sales found</p>
                    <p className="text-sm">This customer has no delivery sales yet.</p>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const deliveryCharges = Number(sale.total_delivery_charges) || 0;
                  const maintenanceCost = Number(sale.maintenance_cost) || 0;
                  const profit = deliveryCharges - maintenanceCost;
                  const saleProfitMargin = deliveryCharges > 0 
                    ? ((profit / deliveryCharges) * 100) 
                    : 0;

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{sale.sale_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(sale.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sale.vehicle ? (
                            <div>
                              <div className="font-medium">{sale.vehicle.name}</div>
                              <div className="text-xs text-gray-500">{sale.vehicle.registration_number}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(deliveryCharges)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-orange-600">
                          {formatCurrency(maintenanceCost)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${profit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {saleProfitMargin.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            sale.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : sale.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewSale(sale)}
                          className="text-orange-600 hover:text-orange-900 p-1 hover:bg-orange-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {start} to {end} of {total} sales
          </div>
          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {lastPage}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


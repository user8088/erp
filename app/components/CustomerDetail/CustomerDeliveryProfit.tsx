"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck, TrendingUp, DollarSign, RefreshCw, ExternalLink, Eye, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { salesApi, vehiclesApi, customersApi } from "../../lib/apiClient";
import type { Sale, VehicleMaintenance } from "../../lib/types";

interface CustomerDeliveryProfitProps {
  customerId: number;
}

interface CustomerDeliveryProfitStats {
  total_delivery_charges: number;
  total_maintenance_costs: number;
  net_profit: number;
  profit_margin_percentage: number;
  total_orders: number;
  period_start?: string;
  period_end?: string;
}

export default function CustomerDeliveryProfit({ customerId }: CustomerDeliveryProfitProps) {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  
  // Date range state
  const [dateRangeType, setDateRangeType] = useState<"month" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Statistics state (from backend API)
  const [stats, setStats] = useState<CustomerDeliveryProfitStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        customer_id: number;
        sale_type: string;
        page: number;
        per_page: number;
        start_date?: string;
        end_date?: string;
      } = {
        customer_id: customerId,
        sale_type: "delivery",
        page,
        per_page: perPage,
      };
      
      // Add date filtering if custom range is selected
      if (dateRangeType === "custom" && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else if (dateRangeType === "month") {
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        params.start_date = monthStart.toISOString().split('T')[0];
        params.end_date = monthEnd.toISOString().split('T')[0];
      }
      
      const data = await salesApi.getSales({
        customer_id: params.customer_id,
        sale_type: "delivery",
        page: params.page,
        per_page: params.per_page,
        start_date: params.start_date,
        end_date: params.end_date,
      });
      setSales(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      console.error("Failed to load delivery sales:", e);
      setError("Failed to load delivery sales.");
    } finally {
      setLoading(false);
    }
  }, [customerId, page, perPage, dateRangeType, selectedMonth, startDate, endDate]);

  const fetchProfitabilityStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params: { start_date?: string; end_date?: string; month?: string } = {};
      
      if (dateRangeType === "month") {
        // Calculate start and end of selected month
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        params.start_date = monthStart.toISOString().split('T')[0];
        params.end_date = monthEnd.toISOString().split('T')[0];
      } else if (dateRangeType === "custom") {
        if (startDate && endDate) {
          params.start_date = startDate;
          params.end_date = endDate;
        }
      }
      
      // Try to use backend API endpoint if available
      try {
        const response = await customersApi.getDeliveryProfitabilityStats(customerId, params);
        setStats(response.statistics);
      } catch (apiError) {
        // Fallback: Calculate on frontend if API not available yet
        console.warn("Backend API not available, calculating on frontend:", apiError);
        
        const salesParams: {
          customer_id: number;
          sale_type: string;
          per_page: number;
          start_date?: string;
          end_date?: string;
        } = {
          customer_id: customerId,
          sale_type: "delivery",
          per_page: 1000,
        };
        
        if (params.start_date) salesParams.start_date = params.start_date;
        if (params.end_date) salesParams.end_date = params.end_date;
        
        const salesData = await salesApi.getSales({
          customer_id: salesParams.customer_id,
          sale_type: "delivery",
          per_page: salesParams.per_page,
          start_date: salesParams.start_date,
          end_date: salesParams.end_date,
        });
        const allSales = salesData.data;
        
        // Get unique vehicle IDs from sales
        const vehicleIds = [...new Set(allSales.map(sale => sale.vehicle_id).filter(id => id !== null && id !== undefined))] as number[];
        
        // Fetch maintenance records for all vehicles used in customer deliveries
        let totalMaintenanceCosts = 0;
        if (vehicleIds.length > 0 && params.start_date && params.end_date) {
          const maintenancePromises = vehicleIds.map(async (vehicleId) => {
            try {
              const maintenanceData = await vehiclesApi.getVehicleMaintenance(vehicleId, {
                per_page: 1000,
                // start_date: params.start_date as string,
                // to_date: params.end_date as string,
              });
              
              return maintenanceData.data.reduce((sum: number, record: VehicleMaintenance) => sum + Number(record.amount || 0), 0);
            } catch (e) {
              console.error(`Failed to fetch maintenance for vehicle ${vehicleId}:`, e);
              return 0;
            }
          });
          
          const maintenanceSums = await Promise.all(maintenancePromises);
          totalMaintenanceCosts = maintenanceSums.reduce((sum, amount) => sum + amount, 0);
        }
        
        const totalDeliveryCharges = allSales.reduce((sum, sale) => sum + (Number(sale.total_delivery_charges) || 0), 0);
        const netProfit = totalDeliveryCharges - totalMaintenanceCosts;
        const profitMargin = totalDeliveryCharges > 0 
          ? ((netProfit / totalDeliveryCharges) * 100) 
          : 0;
        
        setStats({
          total_delivery_charges: totalDeliveryCharges,
          total_maintenance_costs: totalMaintenanceCosts,
          net_profit: netProfit,
          profit_margin_percentage: profitMargin,
          total_orders: allSales.length,
          period_start: params.start_date,
          period_end: params.end_date,
        });
      }
    } catch (e) {
      console.error("Failed to load profitability stats:", e);
    } finally {
      setLoadingStats(false);
    }
  }, [customerId, dateRangeType, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (customerId) {
      void fetchSales();
      void fetchProfitabilityStats();
    }
  }, [customerId, fetchSales, fetchProfitabilityStats]);

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

  const formatDateRange = () => {
    if (dateRangeType === "month") {
      const [year, month] = selectedMonth.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return monthName;
    } else if (dateRangeType === "custom" && startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    }
    return "All Time";
  };

  // Use stats from API if available, otherwise calculate from current page sales
  const totalDeliveryCharges = stats?.total_delivery_charges ?? sales.reduce((sum, sale) => sum + (Number(sale.total_delivery_charges) || 0), 0);
  const totalMaintenanceCosts = stats?.total_maintenance_costs ?? 0;
  const netProfit = stats?.net_profit ?? (totalDeliveryCharges - totalMaintenanceCosts);
  const profitMargin = stats?.profit_margin_percentage ?? (totalDeliveryCharges > 0 
    ? ((netProfit / totalDeliveryCharges) * 100) 
    : 0);
  const totalOrders = stats?.total_orders ?? sales.length;

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
            onClick={() => {
              void fetchSales();
              void fetchProfitabilityStats();
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <span className="text-sm text-gray-600">{formatDateRange()}</span>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="customer-filter-month"
                name="customerDateRangeType"
                checked={dateRangeType === "month"}
                onChange={() => setDateRangeType("month")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="customer-filter-month" className="text-sm text-gray-700 cursor-pointer">
                Month
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="customer-filter-custom"
                name="customerDateRangeType"
                checked={dateRangeType === "custom"}
                onChange={() => setDateRangeType("custom")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="customer-filter-custom" className="text-sm text-gray-700 cursor-pointer">
                Custom Range
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 flex-wrap">
          {dateRangeType === "month" ? (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

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
              onClick={() => {
                void fetchSales();
                void fetchProfitabilityStats();
              }}
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
            <p className="text-xs text-orange-600 mt-1">
              {loadingStats ? "Calculating..." : "From vehicle maintenance records"}
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">No delivery sales found</p>
                      <p className="text-sm">This customer has no delivery sales in the selected period.</p>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => {
                    const deliveryCharges = Number(sale.total_delivery_charges) || 0;

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
    </div>
  );
}

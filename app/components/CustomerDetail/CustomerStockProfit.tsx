"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TrendingUp, Package, DollarSign, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { customersApi } from "../../lib/apiClient";

interface CustomerStockProfitProps {
  customerId: number;
}

interface StockProfitItem {
  item_id: number;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  total_quantity_sold: number;
  unit: string;
  average_cost_price: number; // Average cost price from purchases
  average_selling_price: number; // Average selling price to this customer
  total_cost: number; // total_quantity_sold * average_cost_price
  total_revenue: number; // total_quantity_sold * average_selling_price
  total_profit: number; // total_revenue - total_cost
  profit_margin_percentage: number; // (total_profit / total_revenue) * 100
  transactions_count: number; // Number of sales transactions
  last_sale_date?: string;
}

interface StockProfitTransaction {
  id: number;
  sale_id: number;
  sale_number?: string;
  invoice_id?: number;
  invoice_number?: string;
  item_id: number;
  item_name: string;
  item_brand?: string;
  quantity: number;
  unit: string;
  cost_price: number; // Most recent purchase price (for current profit calculation)
  historical_cost_price: number; // Cost price at time of sale (for trend tracking)
  selling_price: number; // Selling price at time of sale
  total_cost: number; // quantity * cost_price (using latest cost)
  total_revenue: number; // quantity * selling_price
  profit: number; // total_revenue - total_cost (current profit)
  historical_profit: number; // total_revenue - (quantity * historical_cost_price) (profit at time of sale)
  profit_margin_percentage: number; // Current profit margin
  historical_profit_margin_percentage: number; // Profit margin at time of sale
  sale_date: string;
  purchase_invoice_id?: number;
  purchase_invoice_number?: string;
  supplier_id?: number;
  supplier_name?: string;
}

interface CustomerStockProfitStats {
  customer_id: number;
  customer_name: string;
  total_items_sold: number; // Number of unique items
  total_quantity_sold: number; // Total quantity across all items
  total_cost: number; // Total cost of all items sold
  total_revenue: number; // Total revenue from all sales
  total_profit: number; // total_revenue - total_cost
  overall_profit_margin: number; // (total_profit / total_revenue) * 100
  items: StockProfitItem[];
  transactions: StockProfitTransaction[];
  period_start?: string;
  period_end?: string;
}

export default function CustomerStockProfit({ customerId }: CustomerStockProfitProps) {
  const [stats, setStats] = useState<CustomerStockProfitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  // Date range state
  const [dateRangeType, setDateRangeType] = useState<"all" | "month" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchStockProfit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { start_date?: string; end_date?: string; month?: string } = {};
      
      if (dateRangeType === "month") {
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
      
      // Call backend API endpoint
      try {
        const response = await customersApi.getCustomerStockProfit(customerId, params);

        // Normalize transactions so that:
        // - cost_price = cost at time of sale (what you actually bought for then)
        // - historical_cost_price = previous cost (for trend), if available
        // - profit / profit_margin_percentage are based on cost at time of sale
        const normalized: CustomerStockProfitStats = {
          customer_id: response.customer_id,
          customer_name: response.customer_name,
          total_items_sold: response.total_items_sold,
          total_quantity_sold: response.total_quantity_sold,
          total_cost: response.total_cost,
          total_revenue: response.total_revenue,
          total_profit: response.total_profit,
          overall_profit_margin: response.overall_profit_margin,
          items: response.items,
          transactions: response.transactions.map((t: StockProfitTransaction) => {
            const costAtSale =
              // Prefer historical_cost_price from backend if provided
              t.historical_cost_price ?? t.cost_price;
            const previousCost =
              t.historical_cost_price !== undefined
                ? t.cost_price
                : undefined;

            const totalRevenue = t.total_revenue ?? t.quantity * t.selling_price;
            const totalCost = t.total_cost ?? t.quantity * costAtSale;
            const profitAtSale =
              t.historical_profit ?? totalRevenue - totalCost;
            const marginAtSale =
              t.historical_profit_margin_percentage ??
              (totalRevenue > 0 ? (profitAtSale / totalRevenue) * 100 : 0);

            return {
              ...t,
              cost_price: costAtSale,
              historical_cost_price: previousCost ?? costAtSale,
              total_cost: totalCost,
              profit: profitAtSale,
              historical_profit:
                t.profit !== undefined ? t.profit : profitAtSale,
              profit_margin_percentage: marginAtSale,
              historical_profit_margin_percentage:
                t.profit_margin_percentage ?? marginAtSale,
            } as StockProfitTransaction;
          }),
          period_start: response.period_start,
          period_end: response.period_end,
        };

        setStats(normalized);
      } catch (apiError) {
        // Surface a generic error but don't claim the API is missing
        console.error("Failed to fetch stock profit from backend:", apiError);
        setError("Failed to load stock profit from server. Please check backend logs or try again.");
        setStats(null);
      }
    } catch (e) {
      console.error("Failed to load stock profit stats:", e);
      setError("Failed to load stock profit statistics.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, dateRangeType, selectedMonth, startDate, endDate]);

  useEffect(() => {
    if (customerId) {
      void fetchStockProfit();
    }
  }, [customerId, fetchStockProfit]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateRange = () => {
    if (dateRangeType === "all") {
      return "All Time";
    } else if (dateRangeType === "month") {
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

  // Filter and sort transactions by selected item (latest first)
  const filteredTransactions = useMemo((): StockProfitTransaction[] => {
    const transactions = selectedItemId
      ? stats?.transactions.filter(t => t.item_id === selectedItemId) || []
      : stats?.transactions || [];
    
    // Sort by sale_date descending (latest first), then by sale_id descending as tiebreaker
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.sale_date).getTime();
      const dateB = new Date(b.sale_date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // Latest first
      }
      // If same date, sort by sale_id descending
      return (b.sale_id || 0) - (a.sale_id || 0);
    });
  }, [stats?.transactions, selectedItemId]);

  if (loading && !stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-500">Loading stock profit statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => void fetchStockProfit()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-sm text-gray-500">No stock profit data available.</div>
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
                id="profit-filter-all"
                name="profitDateRangeType"
                checked={dateRangeType === "all"}
                onChange={() => setDateRangeType("all")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="profit-filter-all" className="text-sm text-gray-700 cursor-pointer">
                All Time
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="profit-filter-month"
                name="profitDateRangeType"
                checked={dateRangeType === "month"}
                onChange={() => setDateRangeType("month")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="profit-filter-month" className="text-sm text-gray-700 cursor-pointer">
                Month
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="profit-filter-custom"
                name="profitDateRangeType"
                checked={dateRangeType === "custom"}
                onChange={() => setDateRangeType("custom")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="profit-filter-custom" className="text-sm text-gray-700 cursor-pointer">
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
          ) : dateRangeType === "custom" ? (
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
          ) : null}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-green-700">Total Profit</h4>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.total_profit)}</p>
          <p className="text-xs text-green-600 mt-1">
            {stats.overall_profit_margin.toFixed(2)}% profit margin
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-700">Total Revenue</h4>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{formatCurrency(stats.total_revenue)}</p>
          <p className="text-xs text-blue-600 mt-1">From stock sales</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-orange-700">Total Cost</h4>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">{formatCurrency(stats.total_cost)}</p>
          <p className="text-xs text-orange-600 mt-1">Purchase cost</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-700">Items Sold</h4>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">{stats.total_items_sold}</p>
          <p className="text-xs text-purple-600 mt-1">
            {stats.total_quantity_sold.toLocaleString()} total units
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode("summary");
                setSelectedItemId(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "summary"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Summary by Item
            </button>
            <button
              onClick={() => {
                setViewMode("detailed");
                setSelectedItemId(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "detailed"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Detailed Transactions
            </button>
          </div>
        </div>
      </div>

      {/* Summary View - Items Breakdown */}
      {viewMode === "summary" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Profit by Item</h3>
          {stats.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No items sold to this customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.items.map((item) => (
                    <tr
                      key={item.item_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setViewMode("detailed");
                        setSelectedItemId(item.item_id);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        {item.item_brand && (
                          <div className="text-xs text-gray-500">{item.item_brand}</div>
                        )}
                        {item.item_category && (
                          <div className="text-xs text-gray-400">{item.item_category}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.total_quantity_sold.toLocaleString()} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(item.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(item.total_revenue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          item.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.total_profit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          item.profit_margin_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.profit_margin_percentage.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detailed View - Transaction Breakdown */}
      {viewMode === "detailed" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {selectedItemId ? "Transaction Details" : "All Transactions"}
            </h3>
            {selectedItemId && (
              <button
                onClick={() => setSelectedItemId(null)}
                className="text-sm text-orange-600 hover:text-orange-700"
              >
                Show All Items
              </button>
            )}
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={`${transaction.sale_id}-${transaction.item_id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{transaction.item_name}</span>
                      {transaction.item_brand && (
                        <span className="text-xs text-gray-500">({transaction.item_brand})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 ml-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(transaction.sale_date).toLocaleDateString()}
                      </span>
                      {transaction.sale_number && (
                        <span>Sale: {transaction.sale_number}</span>
                      )}
                      {transaction.invoice_number && (
                        <span>Invoice: {transaction.invoice_number}</span>
                      )}
                      {transaction.supplier_name && (
                        <span>Supplier: {transaction.supplier_name}</span>
                      )}
                      {transaction.purchase_invoice_number && (
                        <span>Purchase Invoice: {transaction.purchase_invoice_number}</span>
                      )}
                    </div>
                    <div className="ml-7 mt-1 text-xs text-gray-600">
                      <span className="font-medium">Quantity:</span> {transaction.quantity.toLocaleString()} {transaction.unit}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-gray-500">
                      Cost: {formatCurrency(transaction.cost_price)}/unit
                    </div>
                    {transaction.historical_cost_price !== transaction.cost_price && (
                      <div className="text-xs text-blue-600">
                        Previous Cost: {formatCurrency(transaction.historical_cost_price)}/unit
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Selling: {formatCurrency(transaction.selling_price)}/unit
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      Profit: <span className={transaction.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(transaction.profit)}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className={transaction.profit_margin_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {transaction.profit_margin_percentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => void fetchStockProfit()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}


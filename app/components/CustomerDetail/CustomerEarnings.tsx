"use client";

import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, Percent, Package, ShoppingCart, Calendar, RefreshCw } from "lucide-react";
import { salesApi, invoicesApi, rentalApi, customersApi } from "../../lib/apiClient";
import type { Sale, Invoice, RentalAgreement } from "../../lib/types";

interface CustomerEarningsProps {
  customerId: number;
}

interface CustomerEarningsStats {
  total_sales_revenue: number;
  total_sales_discount: number;
  total_rental_revenue: number;
  total_invoice_revenue: number;
  total_invoice_discount: number;
  total_earnings: number;
  total_discounts_given: number;
  total_orders: number;
  total_rentals: number;
  total_invoices: number;
  period_start?: string;
  period_end?: string;
}

export default function CustomerEarnings({ customerId }: CustomerEarningsProps) {
  const [stats, setStats] = useState<CustomerEarningsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [dateRangeType, setDateRangeType] = useState<"all" | "month" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchEarningsStats = useCallback(async () => {
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
      
      // Try to use backend API endpoint if available
      try {
        const response = await customersApi.getCustomerEarningsStats(customerId, params);
        console.log("Backend API response:", response.statistics);
        // If backend returns 0 discounts but we have sales, recalculate from sales
        if (response.statistics.total_discounts_given === 0) {
          console.log("Backend returned 0 discounts, recalculating from sales data...");
          // Still use backend data but recalculate discounts
          const recalculatedStats = await recalculateDiscountsFromSales(customerId, params, response.statistics);
          setStats(recalculatedStats);
        } else {
          setStats(response.statistics);
        }
      } catch (apiError) {
        // Fallback: Calculate on frontend if API not available yet
        console.warn("Backend API not available, calculating on frontend:", apiError);
        
        // Fetch all sales for customer
        const salesParams: {
          customer_id: number;
          per_page: number;
          start_date?: string;
          end_date?: string;
        } = {
          customer_id: customerId,
          per_page: 1000,
        };
        if (params.start_date) salesParams.start_date = params.start_date;
        if (params.end_date) salesParams.end_date = params.end_date;
        
        const salesData = await salesApi.getSales(salesParams);
        const allSales = salesData.data.filter(sale => sale.status !== 'cancelled');
        
        // Fetch all invoices for customer
        const invoicesParams: {
          customer_id: number;
          invoice_type: 'sale';
          per_page: number;
          start_date?: string;
          end_date?: string;
        } = {
          customer_id: customerId,
          invoice_type: 'sale',
          per_page: 1000,
        };
        if (params.start_date) invoicesParams.start_date = params.start_date;
        if (params.end_date) invoicesParams.end_date = params.end_date;
        
        let allInvoices: Invoice[] = [];
        try {
          const invoicesData = await invoicesApi.getInvoices(invoicesParams);
          allInvoices = invoicesData.invoices.filter(inv => inv.status !== 'cancelled');
        } catch (e) {
          console.warn("Failed to fetch invoices:", e);
        }
        
        // Fetch all rental agreements for customer
        const rentalsParams: {
          customer_id: number;
          per_page: number;
        } = {
          customer_id: customerId,
          per_page: 1000,
        };
        
        let allRentals: RentalAgreement[] = [];
        try {
          const rentalsData = await rentalApi.getAgreements(rentalsParams);
          allRentals = rentalsData.data;
        } catch (e) {
          console.warn("Failed to fetch rentals:", e);
        }
        
        // Calculate totals
        const totalSalesRevenue = allSales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
        const totalSalesDiscount = allSales.reduce((sum, sale) => sum + (Number(sale.total_discount) || 0), 0);
        
        const totalInvoiceRevenue = allInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        
        // Calculate invoice discounts from related sales
        // Invoices reference sales via reference_type='sale' and reference_id
        let totalInvoiceDiscount = 0;
        const processedSaleIds = new Set<number>();
        
        // Process each invoice to get its discount
        const invoiceDiscountPromises = allInvoices.map(async (invoice) => {
          let discount = 0;
          let saleId: number | null = null;
          
          // First, check if sale data is in metadata
          const metadata = invoice.metadata as Record<string, unknown> | undefined;
          if (metadata?.sale) {
            const metaSale = metadata.sale as Sale;
            saleId = metaSale.id;
            discount = Number(metaSale.total_discount) || 0;
          } else if (metadata?.sale_id) {
            saleId = metadata.sale_id as number;
          } else if (invoice.reference_type === 'sale' && invoice.reference_id) {
            saleId = invoice.reference_id;
          }
          
          // If we have a sale ID but no discount from metadata, fetch the sale
          if (saleId && !processedSaleIds.has(saleId) && discount === 0) {
            processedSaleIds.add(saleId);
            try {
              const saleResponse = await salesApi.getSale(saleId);
              const sale = (saleResponse as { sale?: Sale }).sale ?? (saleResponse as unknown as Sale | undefined);
              discount = Number(sale?.total_discount) || 0;
            } catch (e) {
              console.warn(`Failed to fetch sale ${saleId} for discount calculation:`, e);
              discount = 0;
            }
          } else if (saleId) {
            processedSaleIds.add(saleId);
          }
          
          return discount;
        });
        
        const invoiceDiscounts = await Promise.all(invoiceDiscountPromises);
        totalInvoiceDiscount = invoiceDiscounts.reduce((sum, discount) => sum + discount, 0);
        
        const totalRentalRevenue = allRentals.reduce((sum, rental) => {
          // Sum all payments for this rental
          const rentalPayments = rental.payments?.reduce((pSum, payment) => pSum + (Number(payment.amount_paid) || 0), 0) || 0;
          return sum + rentalPayments;
        }, 0);
        
        const totalEarnings = totalSalesRevenue + totalInvoiceRevenue + totalRentalRevenue;
        const totalDiscountsGiven = totalSalesDiscount + totalInvoiceDiscount;
        
        setStats({
          total_sales_revenue: totalSalesRevenue,
          total_sales_discount: totalSalesDiscount,
          total_rental_revenue: totalRentalRevenue,
          total_invoice_revenue: totalInvoiceRevenue,
          total_invoice_discount: totalInvoiceDiscount,
          total_earnings: totalEarnings,
          total_discounts_given: totalDiscountsGiven,
          total_orders: allSales.length,
          total_rentals: allRentals.length,
          total_invoices: allInvoices.length,
          period_start: params.start_date,
          period_end: params.end_date,
        });
      }
    } catch (e) {
      console.error("Failed to load earnings stats:", e);
      setError("Failed to load earnings statistics.");
    } finally {
      setLoading(false);
    }
  }, [customerId, dateRangeType, selectedMonth, startDate, endDate]);

  // Helper function to recalculate discounts from sales
  const recalculateDiscountsFromSales = async (
    customerId: number,
    params: { start_date?: string; end_date?: string; month?: string },
    existingStats?: CustomerEarningsStats
  ): Promise<CustomerEarningsStats> => {
    const salesParams: {
      customer_id: number;
      per_page: number;
      start_date?: string;
      end_date?: string;
    } = {
      customer_id: customerId,
      per_page: 1000,
    };
    if (params.start_date) salesParams.start_date = params.start_date;
    if (params.end_date) salesParams.end_date = params.end_date;
    
    const salesData = await salesApi.getSales(salesParams);
    const allSales = salesData.data.filter(sale => sale.status !== 'cancelled');
    
    console.log("Sales found:", allSales.length);
    console.log("Sample sale:", allSales[0] ? {
      id: allSales[0].id,
      total_discount: allSales[0].total_discount,
      total_amount: allSales[0].total_amount
    } : "No sales");
    
    const totalSalesDiscount = allSales.reduce((sum, sale) => {
      const discount = Number(sale.total_discount) || 0;
      console.log(`Sale ${sale.id}: discount = ${discount}`);
      return sum + discount;
    }, 0);
    
    console.log("Total sales discount calculated:", totalSalesDiscount);
    
    // Fetch invoices to get their discounts
    const invoicesParams: {
      customer_id: number;
      invoice_type: 'sale';
      per_page: number;
      start_date?: string;
      end_date?: string;
    } = {
      customer_id: customerId,
      invoice_type: 'sale',
      per_page: 1000,
    };
    if (params.start_date) invoicesParams.start_date = params.start_date;
    if (params.end_date) invoicesParams.end_date = params.end_date;
    
    let allInvoices: Invoice[] = [];
    try {
      const invoicesData = await invoicesApi.getInvoices(invoicesParams);
      allInvoices = invoicesData.invoices.filter(inv => inv.status !== 'cancelled');
    } catch (e) {
      console.warn("Failed to fetch invoices:", e);
    }
    
    // Calculate invoice discounts from related sales
    let totalInvoiceDiscount = 0;
    const processedSaleIds = new Set<number>();
    
    const invoiceDiscountPromises = allInvoices.map(async (invoice) => {
      let discount = 0;
      let saleId: number | null = null;
      
      const metadata = invoice.metadata as Record<string, unknown> | undefined;
      if (metadata?.sale) {
        const metaSale = metadata.sale as Sale;
        saleId = metaSale.id;
        discount = Number(metaSale.total_discount) || 0;
        console.log(`Invoice ${invoice.id}: discount from metadata = ${discount}`);
      } else if (metadata?.sale_id) {
        saleId = metadata.sale_id as number;
      } else if (invoice.reference_type === 'sale' && invoice.reference_id) {
        saleId = invoice.reference_id;
      }
      
      if (saleId && !processedSaleIds.has(saleId) && discount === 0) {
        processedSaleIds.add(saleId);
        try {
          const saleResponse = await salesApi.getSale(saleId);
          const sale = (saleResponse as { sale?: Sale }).sale ?? (saleResponse as unknown as Sale | undefined);
          discount = Number(sale?.total_discount) || 0;
          console.log(`Invoice ${invoice.id}: fetched sale ${saleId}, discount = ${discount}`);
        } catch (e) {
          console.warn(`Failed to fetch sale ${saleId} for discount calculation:`, e);
          discount = 0;
        }
      } else if (saleId) {
        processedSaleIds.add(saleId);
      }
      
      return discount;
    });
    
    const invoiceDiscounts = await Promise.all(invoiceDiscountPromises);
    totalInvoiceDiscount = invoiceDiscounts.reduce((sum, discount) => sum + discount, 0);
    console.log("Total invoice discount calculated:", totalInvoiceDiscount);
    
    const totalDiscountsGiven = totalSalesDiscount + totalInvoiceDiscount;
    console.log("Total discounts given:", totalDiscountsGiven);
    
    // Use existing stats if provided, otherwise calculate everything
    if (existingStats) {
      return {
        ...existingStats,
        total_sales_discount: totalSalesDiscount,
        total_invoice_discount: totalInvoiceDiscount,
        total_discounts_given: totalDiscountsGiven,
      };
    }
    
    // Calculate everything from scratch
    const totalSalesRevenue = allSales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
    const totalInvoiceRevenue = allInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    
    // Fetch rentals
    const rentalsParams: {
      customer_id: number;
      per_page: number;
    } = {
      customer_id: customerId,
      per_page: 1000,
    };
    
    let allRentals: RentalAgreement[] = [];
    try {
      const rentalsData = await rentalApi.getAgreements(rentalsParams);
      allRentals = rentalsData.data;
    } catch (e) {
      console.warn("Failed to fetch rentals:", e);
    }
    
    const totalRentalRevenue = allRentals.reduce((sum, rental) => {
      const rentalPayments = rental.payments?.reduce((pSum, payment) => pSum + (Number(payment.amount_paid) || 0), 0) || 0;
      return sum + rentalPayments;
    }, 0);
    
    const totalEarnings = totalSalesRevenue + totalInvoiceRevenue + totalRentalRevenue;
    
    return {
      total_sales_revenue: totalSalesRevenue,
      total_sales_discount: totalSalesDiscount,
      total_rental_revenue: totalRentalRevenue,
      total_invoice_revenue: totalInvoiceRevenue,
      total_invoice_discount: totalInvoiceDiscount,
      total_earnings: totalEarnings,
      total_discounts_given: totalDiscountsGiven,
      total_orders: allSales.length,
      total_rentals: allRentals.length,
      total_invoices: allInvoices.length,
      period_start: params.start_date,
      period_end: params.end_date,
    };
  };

  useEffect(() => {
    if (customerId) {
      void fetchEarningsStats();
    }
  }, [customerId, fetchEarningsStats]);

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

  if (loading && !stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-500">Loading earnings statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => void fetchEarningsStats()}
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
        <div className="text-sm text-gray-500">No earnings data available.</div>
      </div>
    );
  }

  const discountPercentage = stats.total_earnings > 0 
    ? (stats.total_discounts_given / (stats.total_earnings + stats.total_discounts_given)) * 100 
    : 0;

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
                id="earnings-filter-all"
                name="earningsDateRangeType"
                checked={dateRangeType === "all"}
                onChange={() => setDateRangeType("all")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="earnings-filter-all" className="text-sm text-gray-700 cursor-pointer">
                All Time
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="earnings-filter-month"
                name="earningsDateRangeType"
                checked={dateRangeType === "month"}
                onChange={() => setDateRangeType("month")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="earnings-filter-month" className="text-sm text-gray-700 cursor-pointer">
                Month
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="earnings-filter-custom"
                name="earningsDateRangeType"
                checked={dateRangeType === "custom"}
                onChange={() => setDateRangeType("custom")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="earnings-filter-custom" className="text-sm text-gray-700 cursor-pointer">
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
            <h4 className="text-sm font-medium text-green-700">Total Earnings</h4>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.total_earnings)}</p>
          <p className="text-xs text-green-600 mt-1">From sales, rentals & invoices</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-orange-700">Total Discounts Given</h4>
            <Percent className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">{formatCurrency(stats.total_discounts_given)}</p>
          <p className="text-xs text-orange-600 mt-1">
            {discountPercentage.toFixed(2)}% of gross revenue
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-700">Gross Revenue</h4>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {formatCurrency(stats.total_earnings + stats.total_discounts_given)}
          </p>
          <p className="text-xs text-blue-600 mt-1">Before discounts</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-700">Total Transactions</h4>
            <ShoppingCart className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {stats.total_orders + stats.total_rentals + stats.total_invoices}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {stats.total_orders} sales, {stats.total_rentals} rentals, {stats.total_invoices} invoices
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-4">
          {/* Sales Revenue */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">Sales Revenue</span>
                <p className="text-xs text-gray-500">{stats.total_orders} orders</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.total_sales_revenue)}</span>
              {stats.total_sales_discount > 0 && (
                <p className="text-xs text-orange-600">-{formatCurrency(stats.total_sales_discount)} discount</p>
              )}
            </div>
          </div>

          {/* Rental Revenue */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">Rental Revenue</span>
                <p className="text-xs text-gray-500">{stats.total_rentals} agreements</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.total_rental_revenue)}</span>
            </div>
          </div>

          {/* Invoice Revenue */}
          {stats.total_invoice_revenue > 0 && (
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Invoice Revenue</span>
                  <p className="text-xs text-gray-500">{stats.total_invoices} invoices</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.total_invoice_revenue)}</span>
                {stats.total_invoice_discount > 0 && (
                  <p className="text-xs text-orange-600">-{formatCurrency(stats.total_invoice_discount)} discount</p>
                )}
              </div>
            </div>
          )}

          {/* Total Discounts */}
          {stats.total_discounts_given > 0 && (
            <div className="flex justify-between items-center py-3 border-b border-gray-100 bg-orange-50 -mx-6 px-6">
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Total Discounts Given</span>
              </div>
              <span className="text-sm font-semibold text-orange-900">{formatCurrency(stats.total_discounts_given)}</span>
            </div>
          )}

          {/* Net Earnings */}
          <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-base font-semibold text-green-900">Net Earnings</span>
            </div>
            <span className="text-xl font-bold text-green-900">{formatCurrency(stats.total_earnings)}</span>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => void fetchEarningsStats()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}


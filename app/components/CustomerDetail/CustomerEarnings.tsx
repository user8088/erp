"use client";

import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, Percent, Package, ShoppingCart, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { salesApi, rentalApi, customersApi, invoicesApi } from "../../lib/apiClient";
import type { RentalAgreement, Invoice } from "../../lib/types";

interface CustomerEarningsProps {
  customerId: number;
}

interface CustomerEarningsStats {
  // Walk-in Sales
  walk_in_sales_revenue?: number;        // Gross revenue from walk-in sales
  walk_in_sales_discount?: number;       // Discounts for walk-in sales
  walk_in_sales_count?: number;         // Count of walk-in sales
  
  // Order/Delivery Sales
  order_sales_revenue?: number;          // Gross revenue from delivery/order sales
  order_sales_discount?: number;         // Discounts for order sales
  order_sales_count?: number;            // Count of delivery/order sales
  
  // Rental Agreements
  rental_revenue?: number;               // Revenue from rental payments
  rental_count?: number;                 // Count of rental agreements
  
  // Payment Breakdown
  total_paid?: number;                   // Total amount paid by customer
  walk_in_paid?: number;                 // Amount paid for walk-in sales
  order_paid?: number;                   // Amount paid for order sales (invoice payments)
  rental_paid?: number;                  // Amount paid for rentals
  
  // Customer Due (Unpaid Invoices)
  customer_due?: number;                 // Total amount customer owes (unpaid invoices)
  unpaid_invoices_count?: number;        // Count of unpaid invoices
  
  // Aggregated Totals (for backward compatibility)
  total_sales_revenue: number;           // Total of all PAID sales (walk-in + paid orders)
  total_sales_discount: number;          // Total discounts
  total_rental_revenue: number;          // Same as rental_revenue
  total_invoice_revenue: number;         // Same as order_sales_revenue (legacy name)
  total_invoice_discount: number;        // Same as order_sales_discount (legacy name)
  total_earnings: number;                // Gross total earnings (only from paid sales)
  total_discounts_given: number;         // Total discounts
  net_earnings?: number;                 // Net earnings after discounts
  total_orders: number;                  // Walk-in sales count (legacy name)
  total_rentals: number;                 // Rental count
  total_invoices: number;                // PAID order sales count (legacy name)
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
        const backendStats = response.statistics;
        
        // Ensure total_earnings represents GROSS revenue (before discounts)
        // Note: Backend should return gross revenue. If it returns net, we need to add discounts.
        // For now, we assume backend returns gross revenue. If backend returns net revenue,
        // the recalculateDiscountsFromSales function will handle the conversion.
        
        // Backend should now return walk_in_sales_revenue and order_sales_revenue separately
        // If not present, calculate from the aggregated fields (backward compatibility)
        if (!backendStats.walk_in_sales_revenue && !backendStats.order_sales_revenue) {
          console.log("Backend returned old format, using frontend calculation...");
          // Fall through to frontend calculation
          throw new Error("Backend format not supported, using frontend calculation");
        }
        
        // Normalize the response to ensure all fields are present
        const normalizedStats = {
          walk_in_sales_revenue: backendStats.walk_in_sales_revenue || 0,
          walk_in_sales_discount: backendStats.walk_in_sales_discount || 0,
          walk_in_sales_count: backendStats.walk_in_sales_count || backendStats.total_orders || 0,
          
          order_sales_revenue: backendStats.order_sales_revenue || backendStats.total_invoice_revenue || 0,
          order_sales_discount: backendStats.order_sales_discount || backendStats.total_invoice_discount || 0,
          order_sales_count: backendStats.order_sales_count || backendStats.total_invoices || 0,
          
          rental_revenue: backendStats.rental_revenue || backendStats.total_rental_revenue || 0,
          rental_count: backendStats.rental_count || backendStats.total_rentals || 0,
          
          // Payment Breakdown
          total_paid: backendStats.total_paid || 0,
          walk_in_paid: backendStats.walk_in_paid || 0,
          order_paid: backendStats.order_paid || 0,
          rental_paid: backendStats.rental_paid || backendStats.rental_revenue || backendStats.total_rental_revenue || 0,
          
          // Customer Due
          customer_due: backendStats.customer_due || 0,
          unpaid_invoices_count: backendStats.unpaid_invoices_count || 0,
          
          // Aggregated fields (for backward compatibility)
          total_sales_revenue: backendStats.total_sales_revenue || 
                              (backendStats.walk_in_sales_revenue || 0) + (backendStats.order_sales_revenue || 0),
          total_sales_discount: backendStats.total_sales_discount || 
                               (backendStats.walk_in_sales_discount || 0) + (backendStats.order_sales_discount || 0),
          total_rental_revenue: backendStats.rental_revenue || backendStats.total_rental_revenue || 0,
          total_invoice_revenue: backendStats.order_sales_revenue || backendStats.total_invoice_revenue || 0,
          total_invoice_discount: backendStats.order_sales_discount || backendStats.total_invoice_discount || 0,
          total_earnings: backendStats.total_earnings || 
                        (backendStats.walk_in_sales_revenue || 0) + 
                        (backendStats.order_sales_revenue || 0) + 
                        (backendStats.rental_revenue || 0),
          total_discounts_given: backendStats.total_discounts_given || 
                               (backendStats.walk_in_sales_discount || 0) + (backendStats.order_sales_discount || 0),
          net_earnings: backendStats.net_earnings,
          total_orders: backendStats.walk_in_sales_count || backendStats.total_orders || 0,
          total_rentals: backendStats.rental_count || backendStats.total_rentals || 0,
          total_invoices: backendStats.order_sales_count || backendStats.total_invoices || 0,
          period_start: backendStats.period_start,
          period_end: backendStats.period_end,
        };
        
        setStats(normalizedStats);
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
        
        // Fetch invoices to check payment status - only PAID invoices count as revenue
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
        
        // Create a map of sale_id to invoice status for quick lookup
        const saleInvoiceStatusMap = new Map<number, 'paid' | 'issued' | 'draft'>();
        allInvoices.forEach(invoice => {
          if (invoice.reference_type === 'sale' && invoice.reference_id) {
            saleInvoiceStatusMap.set(invoice.reference_id, invoice.status as 'paid' | 'issued' | 'draft');
          }
        });
        
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
        
        // Separate sales by type: walk-in vs delivery/order
        // Use sale_type field to distinguish, not invoice presence
        const walkInSales = allSales.filter(sale => sale.sale_type === 'walk-in');
        const deliverySales = allSales.filter(sale => sale.sale_type === 'delivery');
        
        // Calculate walk-in sales revenue (walk-in sales are typically paid immediately)
        const walkInSalesRevenueNet = walkInSales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
        const walkInSalesDiscount = walkInSales.reduce((sum, sale) => sum + (Number(sale.total_discount) || 0), 0);
        const walkInSalesRevenueGross = walkInSalesRevenueNet + walkInSalesDiscount;
        const walkInPaid = walkInSalesRevenueNet; // Walk-in sales are paid immediately
        
        // For delivery/order sales: ONLY count PAID invoices as revenue
        // Unpaid invoices do NOT count as revenue
        const paidDeliverySales = deliverySales.filter(sale => {
          const invoiceStatus = saleInvoiceStatusMap.get(sale.id);
          return invoiceStatus === 'paid'; // Only count if invoice is paid
        });
        
        const paidDeliverySalesRevenueNet = paidDeliverySales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
        const paidDeliverySalesDiscount = paidDeliverySales.reduce((sum, sale) => sum + (Number(sale.total_discount) || 0), 0);
        const paidDeliverySalesRevenueGross = paidDeliverySalesRevenueNet + paidDeliverySalesDiscount;
        const orderPaid = paidDeliverySalesRevenueNet; // Amount paid for orders
        
        // Calculate unpaid invoices (customer due)
        const unpaidInvoices = allInvoices.filter(inv => inv.status === 'issued');
        const customerDue = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
        
        // Total sales revenue = walk-in sales + PAID delivery/order sales only
        const totalSalesRevenueGross = walkInSalesRevenueGross + paidDeliverySalesRevenueGross;
        const totalSalesDiscount = walkInSalesDiscount + paidDeliverySalesDiscount;
        
        const totalRentalRevenue = allRentals.reduce((sum, rental) => {
          // Sum all payments for this rental
          const rentalPayments = rental.payments?.reduce((pSum, payment) => pSum + (Number(payment.amount_paid) || 0), 0) || 0;
          return sum + rentalPayments;
        }, 0);
        const rentalPaid = totalRentalRevenue; // Rental payments are already paid amounts
        
        // Total Earnings should be GROSS revenue (before discounts) from PAID sales only
        const totalEarnings = totalSalesRevenueGross + totalRentalRevenue;
        const totalDiscountsGiven = totalSalesDiscount;
        
        // Total paid by customer
        const totalPaid = walkInPaid + orderPaid + rentalPaid;
        
        setStats({
          // Walk-in Sales
          walk_in_sales_revenue: walkInSalesRevenueGross,
          walk_in_sales_discount: walkInSalesDiscount,
          walk_in_sales_count: walkInSales.length,
          
          // Order/Delivery Sales (ONLY PAID)
          order_sales_revenue: paidDeliverySalesRevenueGross,
          order_sales_discount: paidDeliverySalesDiscount,
          order_sales_count: paidDeliverySales.length,
          
          // Rental Agreements
          rental_revenue: totalRentalRevenue,
          rental_count: allRentals.length,
          
          // Payment Breakdown
          total_paid: totalPaid,
          walk_in_paid: walkInPaid,
          order_paid: orderPaid,
          rental_paid: rentalPaid,
          
          // Customer Due
          customer_due: customerDue,
          unpaid_invoices_count: unpaidInvoices.length,
          
          // Aggregated Totals (for backward compatibility)
          total_sales_revenue: totalSalesRevenueGross,
          total_sales_discount: totalSalesDiscount,
          total_rental_revenue: totalRentalRevenue,
          total_invoice_revenue: paidDeliverySalesRevenueGross, // Legacy: same as order_sales_revenue
          total_invoice_discount: paidDeliverySalesDiscount,    // Legacy: same as order_sales_discount
          total_earnings: totalEarnings,
          total_discounts_given: totalDiscountsGiven,
          net_earnings: totalEarnings - totalDiscountsGiven,
          total_orders: walkInSales.length,
          total_rentals: allRentals.length,
          total_invoices: paidDeliverySales.length, // Only count paid orders
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
    
    // Note: We no longer need to fetch invoices for revenue calculation
    // We use sale_type directly from sales to distinguish walk-in vs delivery/order sales
    
    // Separate sales by type: walk-in vs delivery/order
    // Use sale_type field to distinguish
    const walkInSales = allSales.filter(sale => sale.sale_type === 'walk-in');
    const deliverySales = allSales.filter(sale => sale.sale_type === 'delivery');
    
    // Calculate walk-in sales discount
    const walkInSalesDiscount = walkInSales.reduce((sum, sale) => {
      const discount = Number(sale.total_discount) || 0;
      return sum + discount;
    }, 0);
    
    // Calculate delivery/order sales discount
    const deliverySalesDiscount = deliverySales.reduce((sum, sale) => {
      const discount = Number(sale.total_discount) || 0;
      return sum + discount;
    }, 0);
    
    const totalDiscountsGiven = walkInSalesDiscount + deliverySalesDiscount;
    console.log("Total discounts given:", totalDiscountsGiven);
    
    // Use existing stats if provided, but recalculate gross revenue
    if (existingStats) {
      // Calculate gross revenue from net revenue + discounts
      const walkInSalesRevenueNet = (existingStats.walk_in_sales_revenue || 0) - (existingStats.walk_in_sales_discount || 0);
      const walkInSalesRevenueGross = walkInSalesRevenueNet + walkInSalesDiscount;
      
      const deliverySalesRevenueNet = (existingStats.total_invoice_revenue || 0) - (existingStats.total_invoice_discount || 0);
      const deliverySalesRevenueGross = deliverySalesRevenueNet + deliverySalesDiscount;
      const totalInvoiceRevenueGross = deliverySalesRevenueGross;
      const totalInvoiceDiscount = deliverySalesDiscount;
      
      const totalSalesRevenueGross = walkInSalesRevenueGross + totalInvoiceRevenueGross;
      const totalEarnings = totalSalesRevenueGross + (existingStats.total_rental_revenue || 0);
      
      return {
        ...existingStats,
        total_sales_revenue: totalSalesRevenueGross,
        total_sales_discount: totalDiscountsGiven,
        walk_in_sales_revenue: walkInSalesRevenueGross,
        walk_in_sales_discount: walkInSalesDiscount,
        total_invoice_revenue: totalInvoiceRevenueGross,
        total_invoice_discount: totalInvoiceDiscount,
        total_earnings: totalEarnings,
        total_discounts_given: totalDiscountsGiven,
      };
    }
    
    // Calculate everything from scratch
    // Walk-in sales
    const walkInSalesRevenueNet = walkInSales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
    const walkInSalesRevenueGross = walkInSalesRevenueNet + walkInSalesDiscount;
    
    // Delivery/order sales revenue
    const deliverySalesRevenueNet = deliverySales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
    const deliverySalesRevenueGross = deliverySalesRevenueNet + deliverySalesDiscount;
    
    // Use delivery sales revenue as order sales revenue
    const totalInvoiceRevenueGross = deliverySalesRevenueGross;
    const totalInvoiceDiscount = deliverySalesDiscount;
    
    // Total sales revenue = walk-in + delivery/order
    const totalSalesRevenueGross = walkInSalesRevenueGross + deliverySalesRevenueGross;
    
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
    
    // Total Earnings should be GROSS revenue (before discounts) from the customer
    // totalSalesRevenueGross already includes both walk-in sales and invoice revenue
    const totalEarnings = totalSalesRevenueGross + totalRentalRevenue;
    
    return {
      total_sales_revenue: totalSalesRevenueGross,
      total_sales_discount: totalDiscountsGiven,
      total_rental_revenue: totalRentalRevenue,
      total_invoice_revenue: totalInvoiceRevenueGross,
      total_invoice_discount: totalInvoiceDiscount,
      walk_in_sales_revenue: walkInSalesRevenueGross,
      walk_in_sales_discount: walkInSalesDiscount,
      total_earnings: totalEarnings,
      total_discounts_given: totalDiscountsGiven,
      total_orders: walkInSales.length,
      total_rentals: allRentals.length,
      total_invoices: deliverySales.length,
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

  // Calculate net earnings (gross - discounts)
  const netEarnings = stats.total_earnings - stats.total_discounts_given;
  
  // Discount percentage of gross revenue
  const discountPercentage = stats.total_earnings > 0 
    ? (stats.total_discounts_given / stats.total_earnings) * 100 
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-green-700">Total Earnings</h4>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.total_earnings)}</p>
          <p className="text-xs text-green-600 mt-1">Gross revenue from paid sales & rentals</p>
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
            <h4 className="text-sm font-medium text-blue-700">Net Earnings</h4>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {formatCurrency(netEarnings)}
          </p>
          <p className="text-xs text-blue-600 mt-1">After discounts</p>
        </div>
      </div>

      {/* Additional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-700">Total Transactions</h4>
            <ShoppingCart className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {stats.total_orders + stats.total_rentals + stats.total_invoices}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {(stats.walk_in_sales_count || stats.total_orders || 0)} walk-in, {(stats.order_sales_count || stats.total_invoices || 0)} orders, {(stats.rental_count || stats.total_rentals || 0)} rentals
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-4">
          {/* Walk-in Sales Revenue - Always show, even if 0 */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">Walk-in Sales Revenue</span>
                <p className="text-xs text-gray-500">{(stats.walk_in_sales_count || stats.total_orders || 0)} walk-in sale{(stats.walk_in_sales_count || stats.total_orders || 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.walk_in_sales_revenue || 0)}</span>
              {(stats.walk_in_sales_discount || 0) > 0 && (
                <p className="text-xs text-orange-600">-{formatCurrency(stats.walk_in_sales_discount || 0)} discount</p>
              )}
            </div>
          </div>

          {/* Order/Delivery Sales Revenue - Always show, even if 0 */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">Order Sales Revenue</span>
                <p className="text-xs text-gray-500">{(stats.order_sales_count || stats.total_invoices || 0)} order{(stats.order_sales_count || stats.total_invoices || 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.order_sales_revenue || stats.total_invoice_revenue || 0)}</span>
              {(stats.order_sales_discount || stats.total_invoice_discount || 0) > 0 && (
                <p className="text-xs text-orange-600">-{formatCurrency(stats.order_sales_discount || stats.total_invoice_discount || 0)} discount</p>
              )}
            </div>
          </div>

          {/* Rental Revenue - Always show, even if 0 */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">Rental Agreements Revenue</span>
                <p className="text-xs text-gray-500">{(stats.rental_count || stats.total_rentals || 0)} agreement{(stats.rental_count || stats.total_rentals || 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.rental_revenue || stats.total_rental_revenue || 0)}</span>
            </div>
          </div>

          {/* Customer Due - show only here in breakdown */}
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <span className="text-sm font-medium text-gray-700">Customer Due (Unpaid Invoices)</span>
                <p className="text-xs text-gray-500">
                  {(stats.unpaid_invoices_count || 0)} unpaid invoice{(stats.unpaid_invoices_count || 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-red-700">
                {formatCurrency(stats.customer_due || 0)}
              </span>
            </div>
          </div>

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
            <span className="text-xl font-bold text-green-900">{formatCurrency(netEarnings)}</span>
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


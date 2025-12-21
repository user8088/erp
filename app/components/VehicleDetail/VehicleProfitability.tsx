"use client";

import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { vehiclesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Vehicle, VehicleProfitabilityStats } from "../../lib/types";

interface VehicleProfitabilityProps {
  vehicleId: string;
  vehicle: Vehicle | null;
}

export default function VehicleProfitability({ vehicleId }: VehicleProfitabilityProps) {
  const { addToast } = useToast();
  const [stats, setStats] = useState<VehicleProfitabilityStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Date range state
  const [dateRangeType, setDateRangeType] = useState<"month" | "custom">("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
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
      
      const response = await vehiclesApi.getVehicleProfitabilityStats(Number(vehicleId), params);
      setStats(response.statistics);
    } catch (e) {
      console.error(e);
      addToast("Failed to load profitability statistics.", "error");
    } finally {
      setLoading(false);
    }
  }, [vehicleId, dateRangeType, selectedMonth, startDate, endDate, addToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-sm text-gray-500">Loading profitability statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-sm text-gray-500">No profitability data available.</div>
      </div>
    );
  }

  const isProfitable = stats.net_profit >= 0;

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
                id="filter-month"
                name="dateRangeType"
                checked={dateRangeType === "month"}
                onChange={() => setDateRangeType("month")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="filter-month" className="text-sm text-gray-700 cursor-pointer">
                Month
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="filter-custom"
                name="dateRangeType"
                checked={dateRangeType === "custom"}
                onChange={() => setDateRangeType("custom")}
                className="w-4 h-4 text-orange-600"
              />
              <label htmlFor="filter-custom" className="text-sm text-gray-700 cursor-pointer">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Total Delivery Charges</h4>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_delivery_charges)}</p>
          <p className="text-xs text-gray-500 mt-1">Revenue from deliveries</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Total Maintenance Costs</h4>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-semibold text-red-600">{formatCurrency(stats.total_maintenance_costs)}</p>
          <p className="text-xs text-gray-500 mt-1">Sum of all maintenance records</p>
        </div>

        <div className={`bg-white rounded-lg border-2 p-6 ${isProfitable ? 'border-green-200' : 'border-red-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Net Profit</h4>
            {isProfitable ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <p className={`text-2xl font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.net_profit)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Delivery charges - Maintenance costs</p>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Detailed Statistics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Total Orders</span>
            <span className="text-sm font-semibold text-gray-900">{stats.total_orders}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Total Delivery Charges</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(stats.total_delivery_charges)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Total Maintenance Costs</span>
            <span className="text-sm font-semibold text-red-600">{formatCurrency(stats.total_maintenance_costs)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 mb-2 italic">
            Sum of all maintenance records (fuel, repairs, services) in selected period
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Net Profit</span>
            <span className={`text-sm font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.net_profit)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">Profit Margin</span>
            <span className={`text-sm font-semibold ${stats.profit_margin_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.profit_margin_percentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Profit Margin Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Profit Margin</span>
            <span className="text-sm font-semibold text-gray-900">{stats.profit_margin_percentage.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${isProfitable ? 'bg-green-600' : 'bg-red-600'}`}
              style={{
                width: `${Math.min(Math.abs(stats.profit_margin_percentage), 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

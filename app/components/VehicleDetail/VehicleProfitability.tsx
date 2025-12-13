"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { vehiclesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Vehicle, VehicleProfitabilityStats } from "../../lib/types";

interface VehicleProfitabilityProps {
  vehicleId: string;
  vehicle: Vehicle | null;
}

export default function VehicleProfitability({ vehicleId, vehicle }: VehicleProfitabilityProps) {
  const { addToast } = useToast();
  const [stats, setStats] = useState<VehicleProfitabilityStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, [vehicleId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await vehiclesApi.getVehicleProfitabilityStats(Number(vehicleId));
      setStats(response.statistics);
    } catch (e) {
      console.error(e);
      addToast("Failed to load profitability statistics.", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
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
          <p className="text-xs text-gray-500 mt-1">Maintenance expenses</p>
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


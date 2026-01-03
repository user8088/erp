"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Filter, MoreVertical, RefreshCw } from "lucide-react";
import { stockApi } from "../../lib/apiClient";

interface ChartDataItem {
  category: string;
  value: number;
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formattedValue = new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 relative">
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
          <span className="text-sm font-semibold text-gray-900">
            PKR {formattedValue}
          </span>
        </div>
        <p className="text-xs text-gray-500">Total Stock Value</p>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white"></div>
        <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-gray-200"></div>
      </div>
    );
  }
  return null;
};

export default function CategoryStockChart() {
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await stockApi.getCategoryStockValueSummary();
      
      // Map API response to chart data format
      const chartData: ChartDataItem[] = response.data.map(item => ({
        category: item.category_name,
        value: item.stock_value,
      }));

      setData(chartData);
      setTotalValue(response.summary.total_value);
    } catch (err) {
      console.error("Failed to fetch category stock value summary:", err);
      setError("Failed to load chart data");
      setData([]);
      setTotalValue(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Calculate dynamic Y-axis domain based on max value
  const maxValue = data.length > 0 ? Math.max(...data.map(item => item.value)) : 0;
  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.1) : 1000000; // Add 10% padding
  const yAxisTicks = maxValue > 0 
    ? [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax * 0.75, yAxisMax]
    : [0, 250000, 500000, 750000, 1000000];

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Category-wise Stock Value</h2>
            <p className="text-xs text-gray-500 mt-1">Loading chart data...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[300px]">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Category-wise Stock Value</h2>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-50 rounded transition-colors"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          <div className="text-center">
            <p className="mb-2">Unable to load chart data</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-orange-500 hover:text-orange-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Category-wise Stock Value</h2>
            <p className="text-xs text-gray-500 mt-1">No stock data available</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No categories with stock found
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Category-wise Stock Value</h2>
          <p className="text-xs text-gray-500 mt-1">
            Total Value: PKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded transition-colors" title="Filter">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded transition-colors" title="More options">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis 
            dataKey="category" 
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 100000) {
                return `${(value / 100000).toFixed(1)} L`;
              }
              return `${(value / 1000).toFixed(0)}K`;
            }}
            domain={[0, yAxisMax]}
            ticks={yAxisTicks}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ fill: 'transparent' }}
          />
          <Bar 
            dataKey="value" 
            fill="#f97316" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

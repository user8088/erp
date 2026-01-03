"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Filter, MoreVertical, RefreshCw } from "lucide-react";
import { purchaseOrdersApi } from "../../lib/apiClient";

interface ChartDataItem {
  month: string;
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
    const formattedValue = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    // Extract month abbreviation (e.g., "Jul (Amt)" -> "JUL (AMT)")
    const monthLabel = label?.toUpperCase() || '';

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 relative">
        {/* Month label */}
        <p className="text-sm font-medium text-gray-700 mb-2">{monthLabel}</p>
        
        {/* Value with pink square icon */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-pink-500 rounded-sm"></div>
          <span className="text-sm font-semibold text-gray-900">
            Rs {formattedValue}
          </span>
        </div>
        
        {/* Description */}
        <p className="text-xs text-gray-500">Monthly Purchase Value</p>
        
        {/* Bottom pointer/triangle */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white"></div>
        <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-gray-200"></div>
      </div>
    );
  }
  return null;
};

export default function PurchaseOrderTrendsChart() {
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await purchaseOrdersApi.getPurchaseOrderTrends({
        period_type: "monthly",
      });
      
      // Map API response to chart data format
      const chartData: ChartDataItem[] = response.data.map(item => ({
        month: `${item.month_abbr} (Amt)`,
        value: item.value,
      }));

      setData(chartData);
    } catch (err) {
      console.error("Failed to fetch purchase order trends:", err);
      setError("Failed to load chart data");
      setData([]);
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
  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.1) : 600000; // Add 10% padding, default to 600000
  const yAxisTicks = maxValue > 0 
    ? [0, yAxisMax * 0.33, yAxisMax * 0.67, yAxisMax]
    : [0, 200000, 400000, 600000];

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Purchase Order Trends</h2>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Purchase Order Trends</h2>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Purchase Order Trends</h2>
        </div>
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No purchase order data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Purchase Order Trends</h2>
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
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorPink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis 
            dataKey="month" 
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
                return `${value / 100000} L`;
              }
              return `${value / 1000}K`;
            }}
            domain={[0, yAxisMax]}
            ticks={yAxisTicks}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: '#ec4899', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#ec4899" 
            strokeWidth={2}
            fill="url(#colorPink)"
            dot={{ fill: '#ec4899', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

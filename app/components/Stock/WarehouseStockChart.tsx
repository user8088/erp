"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [viewMode, setViewMode] = useState<'category' | 'item'>('category');
  const [showFilter, setShowFilter] = useState(false);

  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let chartData: ChartDataItem[] = [];
      let total = 0;

      if (viewMode === 'category') {
        const response = await stockApi.getCategoryStockValueSummary();
        chartData = response.data.map(item => ({
          category: item.category_name,
          value: item.stock_value,
        }));
        total = response.summary.total_value;
      } else {
        const response = await stockApi.getItemStockValueSummary({ limit: 10 });
        chartData = response.data.map(item => ({
          category: item.item_name,
          value: item.stock_value,
        }));
        total = response.summary.total_value;
      }

      setData(chartData);
      setTotalValue(total);
    } catch (err) {
      console.error("Failed to fetch stock value summary:", err);
      setError("Failed to load chart data");
      setData([]);
      setTotalValue(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const toggleViewMode = (mode: 'category' | 'item') => {
    setViewMode(mode);
    setShowFilter(false);
  };

  // Calculate dynamic Y-axis domain based on max value
  const maxValue = data.length > 0 ? Math.max(...data.map(item => item.value)) : 0;
  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue * 1.1) : 1000000; // Add 10% padding
  const yAxisTicks = maxValue > 0
    ? [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax * 0.75, yAxisMax]
    : [0, 250000, 500000, 750000, 1000000];

  if (loading && !refreshing && data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'category' ? 'Category-wise Stock Value' : 'Top Items by Stock Value'}
            </h2>
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
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'category' ? 'Category-wise Stock Value' : 'Top Items by Stock Value'}
            </h2>
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {viewMode === 'category' ? 'Category-wise Stock Value' : 'Top Items by Stock Value'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Total Value: PKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`p-2 hover:bg-gray-50 rounded transition-colors ${showFilter ? 'bg-gray-100' : ''}`}
              title="Filter View"
            >
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            {showFilter && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200 py-1">
                <button
                  onClick={() => toggleViewMode('category')}
                  className={`block w-full text-left px-4 py-2 text-sm ${viewMode === 'category' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  By Category
                </button>
                <button
                  onClick={() => toggleViewMode('item')}
                  className={`block w-full text-left px-4 py-2 text-sm ${viewMode === 'item' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  By Item (Top 10)
                </button>
              </div>
            )}
          </div>

          <button className="p-2 hover:bg-gray-50 rounded transition-colors" title="More options">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No {viewMode} stock data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="category"
              stroke="#9ca3af"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
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
              fill={viewMode === 'category' ? "#f97316" : "#3b82f6"}
              radius={[4, 4, 0, 0]}
              barSize={viewMode === 'item' ? 40 : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

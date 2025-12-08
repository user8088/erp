"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Filter, MoreVertical } from "lucide-react";

// Mock data - will be replaced with real data from API
const data = [
  { category: "Construction Material", value: 850000 },
  { category: "Electronics", value: 520000 },
  { category: "Hardware", value: 380000 },
  { category: "Paint & Supplies", value: 240000 },
  { category: "Tools", value: 180000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
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
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

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
          <button className="p-2 hover:bg-gray-50 rounded transition-colors">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded transition-colors">
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
            domain={[0, 1000000]}
            ticks={[0, 250000, 500000, 750000, 1000000]}
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


"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Filter, MoreVertical } from "lucide-react";

const data = [
  { month: "Jul (Amt)", value: 552247 },
  { month: "Aug (Amt)", value: 0 },
  { month: "Sep (Amt)", value: 0 },
  { month: "Oct (Amt)", value: 0 },
  { month: "Nov (Amt)", value: 0 },
  { month: "Dec (Amt)", value: 0 },
  { month: "Jan (Amt)", value: 0 },
  { month: "Feb (Amt)", value: 0 },
  { month: "Mar (Amt)", value: 0 },
  { month: "Apr (Amt)", value: 0 },
  { month: "May (Amt)", value: 0 },
  { month: "Jun (Amt)", value: 0 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Purchase Order Trends</h2>
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
            domain={[0, 600000]}
            ticks={[0, 200000, 400000, 600000]}
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


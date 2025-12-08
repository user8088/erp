"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Filter, MoreVertical } from "lucide-react";

const data = [
  { period: "Jul-Sep (Amt)", value: 50000 },
  { period: "Oct-Dec (Amt)", value: 80000 },
  { period: "Jan-Mar (Amt)", value: 350000 },
  { period: "Apr-Jun (Amt)", value: 10000 },
];

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

    const periodLabel = label?.toUpperCase() || '';

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 relative">
        <p className="text-sm font-medium text-gray-700 mb-2">{periodLabel}</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-pink-500 rounded-sm"></div>
          <span className="text-sm font-semibold text-gray-900">
            Rs {formattedValue}
          </span>
        </div>
        <p className="text-xs text-gray-500">Quarterly Sales Value</p>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white"></div>
        <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-gray-200"></div>
      </div>
    );
  }
  return null;
};

export default function SalesOrderTrendsChart() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sales Order Trends</h2>
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
            dataKey="period" 
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
            domain={[0, 400000]}
            ticks={[0, 100000, 200000, 300000, 400000]}
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


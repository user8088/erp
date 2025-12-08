"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Filter, MoreVertical } from "lucide-react";

const data = [
  {
    period: "2025-2026",
    Income: 350000,
    Expense: 250000,
    "Net Profit/Loss": 100000,
  },
];

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    period: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const colors: { [key: string]: string } = {
      Income: "#ec4899",
      Expense: "#3b82f6",
      "Net Profit/Loss": "#10b981",
    };

    const formatValue = (value: number) => {
      if (value >= 100000) {
        return `Rs ${(value / 100000).toFixed(2)} L`;
      }
      return `Rs ${(value / 1000).toFixed(2)} K`;
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <p className="text-sm font-semibold text-gray-900 mb-2">{payload[0].payload.period}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm mb-1" style={{ color: colors[entry.name] || "#000" }}>
            {entry.name} : {formatValue(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProfitLossChart() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Profit and Loss</h2>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-50 rounded transition-colors">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-50 rounded transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap="30%"
        >
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Legend 
            wrapperStyle={{ paddingTop: '24px' }}
            iconType="rect"
            iconSize={12}
            formatter={(value) => <span style={{ color: '#374151', fontSize: '12px' }}>{value}</span>}
          />
          <Bar 
            dataKey="Income" 
            fill="#ec4899" 
            name="Income"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
          <Bar 
            dataKey="Expense" 
            fill="#3b82f6" 
            name="Expense"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
          <Bar 
            dataKey="Net Profit/Loss" 
            fill="#10b981" 
            name="Net Profit/Loss"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


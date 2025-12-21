"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendDataPoint {
  period: string;
  value: number;
  label: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  metric: string;
  trend: "increasing" | "decreasing" | "stable";
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `Rs ${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `Rs ${(value / 1000).toFixed(2)}K`;
  }
  return `Rs ${value.toFixed(2)}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-900 mb-2">
          {payload[0].payload.label}
        </p>
        <p className="text-sm" style={{ color: "#3b82f6" }}>
          {payload[0].name}: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function TrendChart({ data, metric, trend }: TrendChartProps) {
  const chartData = data.map((point) => ({
    period: point.label,
    [metric === "revenue" ? "Revenue" : "Expense"]: point.value,
  }));

  const lineColor = trend === "increasing" ? "#10b981" : trend === "decreasing" ? "#ef4444" : "#6b7280";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {metric === "revenue" ? "Revenue" : "Expense"} Trend
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {data.length} data points over the selected period
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="period"
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${value / 1000000}M`;
              if (value >= 1000) return `${value / 1000}K`;
              return value.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
            formatter={(value) => (
              <span style={{ color: "#374151", fontSize: "12px" }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey={metric === "revenue" ? "Revenue" : "Expense"}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, r: 4 }}
            activeDot={{ r: 6 }}
            name={metric === "revenue" ? "Revenue" : "Expense"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


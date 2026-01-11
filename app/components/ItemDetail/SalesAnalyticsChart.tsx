"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
    ComposedChart
} from "recharts";
import { itemsApi } from "../../lib/apiClient";
import type { SalesAnalyticsResponse } from "../../lib/types";
import { Calendar, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";

interface SalesAnalyticsChartProps {
    itemId: number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

export default function SalesAnalyticsChart({ itemId }: SalesAnalyticsChartProps) {
    const [period, setPeriod] = useState<Period>("monthly");
    const [data, setData] = useState<SalesAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!itemId) return;
        setLoading(true);
        try {
            const response = await itemsApi.getSalesAnalytics(itemId, { period });
            setData(response);
        } catch (error) {
            console.error("Failed to fetch sales analytics:", error);
        } finally {
            setLoading(false);
        }
    }, [itemId, period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading && !data) {
        return (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    <p className="text-sm text-gray-500">Loading sales analytics...</p>
                </div>
            </div>
        );
    }

    if (!data || data.chart_data.length === 0) {
        return (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <TrendingUp className="w-10 h-10 mb-1" />
                    <p className="text-sm font-medium text-gray-500">No Analytics Data Available</p>
                    <p className="text-xs">Sales data will appear here once transactions are recorded.</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md text-sm">
                    <p className="font-semibold text-gray-800 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-600 capitalize">
                                {entry.name}:
                            </span>
                            <span className="font-medium text-gray-900">
                                {entry.name === 'Revenue'
                                    ? `PKR ${Number(entry.value).toLocaleString()}`
                                    : Number(entry.value).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Sales Performance</h3>
                    <p className="text-sm text-gray-500">Track revenue and sales volume over time</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                    {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-orange-800 mb-1">Total Revenue</p>
                        <div className="text-2xl font-bold text-gray-900">
                            PKR {data.summary.total_revenue.toLocaleString()}
                        </div>
                        {data.summary.revenue_growth !== undefined && (
                            <div className={`flex items-center text-xs mt-1 font-medium ${data.summary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {data.summary.revenue_growth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {Math.abs(data.summary.revenue_growth)}% vs previous {period}
                            </div>
                        )}
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <DollarSign className="w-5 h-5 text-orange-600" />
                    </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">Total Quantity Sold</p>
                        <div className="text-2xl font-bold text-gray-900">
                            {data.summary.total_quantity.toLocaleString()} <span className="text-sm font-normal text-gray-500">units</span>
                        </div>
                        {data.summary.quantity_growth !== undefined && (
                            <div className={`flex items-center text-xs mt-1 font-medium ${data.summary.quantity_growth >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {data.summary.quantity_growth >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {Math.abs(data.summary.quantity_growth)}% vs previous {period}
                            </div>
                        )}
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <Package className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.chart_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            tickFormatter={(value) => `PKR ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#F97316"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#F97316", stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="quantity"
                            name="Quantity"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

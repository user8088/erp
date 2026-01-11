"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";
import { itemsApi, stockApi } from "../../lib/apiClient";
import type { StockAnalyticsResponse } from "../../lib/types";
import { Package, ArrowDownLeft, ArrowUpRight, Activity } from "lucide-react";

interface StockAnalyticsChartProps {
    itemId: number;
}

type Period = "daily" | "weekly" | "monthly";

export default function StockAnalyticsChart({ itemId }: StockAnalyticsChartProps) {
    const [period, setPeriod] = useState<Period>("monthly");
    const [data, setData] = useState<StockAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!itemId) return;
        setLoading(true);
        try {
            const response = await stockApi.getStockAnalytics(itemId, { period });
            setData(response);
        } catch (error) {
            console.error("Failed to fetch stock analytics:", error);
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
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    <p className="text-sm text-gray-500">Loading stock analytics...</p>
                </div>
            </div>
        );
    }

    if (!data || data.chart_data.length === 0) {
        return (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Activity className="w-10 h-10 mb-1" />
                    <p className="text-sm font-medium text-gray-500">No Analytics Data Available</p>
                    <p className="text-xs">Stock movement data will appear here once inventory changes occur.</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md text-sm">
                    <p className="font-semibold text-gray-800 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => {
                        // Skip the "net_change" bar which we might use for a line later, or key off the name
                        return (
                            <div key={index} className="flex items-center gap-2 mb-1">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-gray-600 capitalize">
                                    {entry.name}:
                                </span>
                                <span className={`font-medium ${entry.name === 'Incoming' ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.abs(Number(entry.value)).toLocaleString()}
                                </span>
                            </div>
                        );
                    })}

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                        <span className="text-gray-500">Net Change:</span>
                        <span className={`font-bold ${payload[0].payload.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {payload[0].payload.net_change > 0 ? '+' : ''}{payload[0].payload.net_change.toLocaleString()}
                        </span>
                    </div>
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
                    <h3 className="text-lg font-semibold text-gray-900">Stock Movement Analysis</h3>
                    <p className="text-sm text-gray-500">Visualize inflow vs outflow of inventory</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                    {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
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
                <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Current Stock Level</p>
                        <div className="text-2xl font-bold text-gray-900">
                            {data.summary.current_stock.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Units currently on hand</p>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-full">
                        <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>

                {data.summary.turnover_rate !== undefined && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Turnover Rate</p>
                            <div className="text-2xl font-bold text-gray-900">
                                {data.summary.turnover_rate}x
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Inventory turnover ratio (approx.)</p>
                        </div>
                        <div className="bg-teal-50 p-2 rounded-full">
                            <Activity className="w-5 h-5 text-teal-600" />
                        </div>
                    </div>
                )}
            </div>

            {/* Main Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data.chart_data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <ReferenceLine y={0} stroke="#9CA3AF" />

                        <Line
                            type="monotone"
                            dataKey="incoming"
                            name="Incoming"
                            stroke="#22C55E"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#22C55E", stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="outgoing"
                            name="Outgoing"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#EF4444", stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

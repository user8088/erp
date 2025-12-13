"use client";

import { Edit, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle } from "../../lib/types";

interface VehiclesTableProps {
  vehicles: Vehicle[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
  onSelectionChange?: (selectedIds: Set<number>) => void;
}

export default function VehiclesTable({ vehicles, loading, onDelete, onBulkDelete, onSelectionChange }: VehiclesTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const hasStats = vehicles.some(v => v.total_orders !== undefined || v.profitability_stats);
  const hasOrders = vehicles.some(v => v.total_orders !== undefined);
  const hasProfit = vehicles.some(v => v.profitability_stats);
  const baseCols = 7; // checkbox, icon, name, reg, type, status, actions
  const totalCols = baseCols + (hasOrders ? 1 : 0) + (hasProfit ? 1 : 0);

  const handleSelectAll = () => {
    const newSelected = selectAll ? new Set<number>() : new Set(vehicles.map((vehicle) => vehicle.id));
    setSelectedRows(newSelected);
    setSelectAll(!selectAll);
    onSelectionChange?.(newSelected);
  };

  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === vehicles.length);
    onSelectionChange?.(newSelected);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && vehicles.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading vehicles...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Icon</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Registration Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
              {hasOrders && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Total Orders</th>
              )}
              {hasProfit && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Net Profit</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => {
              const statusLabel = vehicle.status === "active" ? "Active" : "Inactive";
              const statusColor = vehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";

              return (
                <tr
                  key={vehicle.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                      return;
                    }
                    router.push(`/transport/${vehicle.id}`);
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(vehicle.id)}
                      onChange={() => handleSelectRow(vehicle.id)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                      <Truck className="w-5 h-5" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {vehicle.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {vehicle.registration_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {vehicle.type || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </td>
                  {vehicle.total_orders !== undefined && (
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {vehicle.total_orders}
                    </td>
                  )}
                  {vehicle.profitability_stats && (
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={vehicle.profitability_stats.net_profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {formatCurrency(vehicle.profitability_stats.net_profit)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/transport/${vehicle.id}`);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit vehicle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${vehicle.name}?`)) {
                              onDelete(vehicle.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && vehicles.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No vehicles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}


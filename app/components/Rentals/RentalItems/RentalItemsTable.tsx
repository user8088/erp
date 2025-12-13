"use client";

import { Edit, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RentalItem } from "../../../lib/types";

interface RentalItemsTableProps {
  items: RentalItem[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
  onSelectionChange?: (selectedIds: Set<number>) => void;
}

export default function RentalItemsTable({ items, loading, onDelete, onBulkDelete, onSelectionChange }: RentalItemsTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    const newSelected = selectAll ? new Set<number>() : new Set(items.map((item) => item.id));
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
    setSelectAll(newSelected.size === items.length);
    onSelectionChange?.(newSelected);
  };

  const getStatusLabel = (item: RentalItem): string => {
    if (item.quantity_available === item.quantity_total) {
      return "Available";
    } else if (item.quantity_available === 0) {
      return "Fully Rented";
    } else {
      return "Partially Rented";
    }
  };

  const getStatusColor = (item: RentalItem): string => {
    if (item.quantity_available === item.quantity_total) {
      return "bg-green-100 text-green-800";
    } else if (item.quantity_available === 0) {
      return "bg-orange-100 text-orange-800";
    } else {
      return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatQuantity = (qty: number): string => {
    // Show 4 decimal places if needed, otherwise show as integer
    if (qty % 1 === 0) {
      return qty.toString();
    }
    return qty.toFixed(4).replace(/\.?0+$/, "");
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && items.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading rental items...</div>
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Item Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Item Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Total Qty</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Available</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rented</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental Price</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Period</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const currentlyRented = item.quantity_total - item.quantity_available;
              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                      return;
                    }
                    router.push(`/rental/items/${item.id}`);
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {item.sku}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {item.rental_category?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatQuantity(item.quantity_total)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatQuantity(item.quantity_available)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatQuantity(currentlyRented)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatCurrency(item.rent_per_period)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {item.rental_period_length} {item.rental_period_type}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item)}`}>
                      {getStatusLabel(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/rental/items/${item.id}`);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No rental items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}


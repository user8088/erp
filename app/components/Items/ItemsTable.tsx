"use client";

import { Edit, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "../../lib/types";

interface ItemsTableProps {
  items: Item[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
  onSelectionChange?: (selectedIds: Set<number>) => void;
}

export default function ItemsTable({ items, loading, onDelete, onBulkDelete, onSelectionChange }: ItemsTableProps) {
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && items.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading items...</div>
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Picture</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Serial #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Brand</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                      return;
                    }
                    router.push(`/items/${item.id}`);
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
                  <td className="px-4 py-3">
                    {item.picture_url ? (
                      <img
                        src={item.picture_url}
                        alt={item.name}
                        className="w-12 h-12 rounded object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold border border-gray-200">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {item.serial_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {item.brand || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {item.category?.name || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/items/${item.id}`);
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
                            if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                              onDelete(item.id);
                            }
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
                  colSpan={7}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

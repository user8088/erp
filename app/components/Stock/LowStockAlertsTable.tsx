"use client";

import { AlertTriangle, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ItemStock } from "../../lib/types";

interface LowStockAlertsTableProps {
  stock: ItemStock[];
  loading?: boolean;
  onCreatePO?: (itemIds: number[]) => void;
}

export default function LowStockAlertsTable({ stock, loading, onCreatePO }: LowStockAlertsTableProps) {
  const router = useRouter();

  const formatStockLevel = (current: number, reorder: number) => {
    const percentage = (current / reorder) * 100;
    return {
      percentage,
      color: percentage === 0 ? 'text-red-600' : percentage <= 50 ? 'text-orange-600' : 'text-yellow-600'
    };
  };

  return (
    <div className="space-y-4">
      {/* Alert Header */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-900">Low Stock Alert</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {stock.filter((item) => item.item !== null && item.item !== undefined).length} item{stock.filter((item) => item.item !== null && item.item !== undefined).length !== 1 ? 's' : ''} below or at reorder level. Consider creating purchase orders.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && stock.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading alerts...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Picture</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Serial #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Item Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Current Stock</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Reorder Level</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Suggested Order</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stock.filter((item) => item.item !== null && item.item !== undefined).map((item) => {
              const { color } = formatStockLevel(item.quantity_on_hand, item.reorder_level);
              const suggestedOrder = Math.max(item.reorder_level * 2 - item.quantity_on_hand, item.reorder_level);
              
              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/items/${item.item_id}`)}
                >
                  <td className="px-4 py-3">
                    {item.item?.picture_url ? (
                      <img
                        src={item.item.picture_url}
                        alt={item.item.name}
                        className="w-12 h-12 rounded object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold border border-gray-200">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {item.item?.serial_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {item.item?.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {item.item?.category?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap text-right">
                    <div>
                      <span className={`font-semibold ${color}`}>
                        {Math.floor(item.quantity_on_hand).toLocaleString()} {item.item?.primary_unit || 'units'}
                      </span>
                      {item.item?.secondary_unit && item.item?.conversion_rate && (
                        <div className="text-xs text-gray-500">
                          ({Math.floor(item.quantity_on_hand * item.item.conversion_rate).toLocaleString()} {item.item.secondary_unit})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-right">
                    {Math.floor(item.reorder_level).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                    <div className="font-medium">{Math.floor(suggestedOrder).toLocaleString()} {item.item?.primary_unit || 'units'}</div>
                    {item.item?.secondary_unit && item.item?.conversion_rate && (
                      <div className="text-xs text-gray-500">
                        ({Math.floor(suggestedOrder * item.item.conversion_rate).toLocaleString()} {item.item.secondary_unit})
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/stock/purchase-orders/new?item_id=${item.item_id}&quantity=${suggestedOrder}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create PO
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && stock.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">All items are well stocked!</p>
                    <p className="text-xs text-gray-500">No low stock alerts at this time.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

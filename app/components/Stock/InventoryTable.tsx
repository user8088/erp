"use client";

import { useState } from "react";
import { Package, Edit, History, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ItemStock, StockStatus } from "../../lib/types";

interface InventoryTableProps {
  stock: ItemStock[];
  loading?: boolean;
  onAdjustStock?: (itemId: number) => void;
  onReorderLevelChange?: (itemId: number, newLevel: number) => Promise<void>;
  onSuggestReorderLevel?: (itemId: number) => Promise<number | null>;
}

export default function InventoryTable({ 
  stock, 
  loading, 
  onAdjustStock,
  onReorderLevelChange,
  onSuggestReorderLevel
}: InventoryTableProps) {
  const router = useRouter();
  const [editingReorderLevel, setEditingReorderLevel] = useState<number | null>(null);
  const [reorderLevelValues, setReorderLevelValues] = useState<Record<number, number>>({});

  const getStockStatus = (item: ItemStock): StockStatus => {
    const quantity = Number(item.quantity_on_hand);
    const reorderLevel = Number(item.reorder_level);
    
    if (quantity === 0 || quantity < 0) return 'out_of_stock';
    if (quantity > 0 && quantity <= reorderLevel) return 'low_stock';
    return 'in_stock';
  };

  const getStatusBadge = (status: StockStatus) => {
    const styles = {
      in_stock: "bg-green-100 text-green-800 border-green-200",
      low_stock: "bg-yellow-100 text-yellow-800 border-yellow-200",
      out_of_stock: "bg-red-100 text-red-800 border-red-200",
    };

    const labels = {
      in_stock: "In Stock",
      low_stock: "Low Stock",
      out_of_stock: "Out of Stock",
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'in_stock' ? 'bg-green-500' : status === 'low_stock' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && stock.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading inventory...</div>
      )}
      <table className="w-full min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Picture</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Serial #</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Item Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Brand</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Current Stock</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Reorder Level</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Stock Value</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stock.filter((item) => item.item !== null && item.item !== undefined).map((item) => {
            const status = getStockStatus(item);
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
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {item.item?.brand || "—"}
                </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                        <div className="font-semibold">{Math.floor(item.quantity_on_hand).toLocaleString()} {item.item?.primary_unit || 'units'}</div>
                        {item.item?.secondary_unit && item.item?.conversion_rate && (
                          <div className="text-xs text-gray-500">
                            ({Math.floor(item.quantity_on_hand * item.item.conversion_rate).toLocaleString()} {item.item.secondary_unit})
                          </div>
                        )}
                      </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  {editingReorderLevel === item.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min="0"
                        value={reorderLevelValues[item.id] ?? item.reorder_level}
                        onChange={(e) => setReorderLevelValues({ ...reorderLevelValues, [item.id]: Number(e.target.value) })}
                        onBlur={async () => {
                          const newValue = reorderLevelValues[item.id];
                          if (newValue !== undefined && newValue !== item.reorder_level && onReorderLevelChange) {
                            await onReorderLevelChange(item.item_id, newValue);
                          }
                          setEditingReorderLevel(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'Escape') {
                            setReorderLevelValues({ ...reorderLevelValues, [item.id]: item.reorder_level });
                            setEditingReorderLevel(null);
                          }
                        }}
                        autoFocus
                        className="w-20 px-2 py-1 text-sm text-right border border-orange-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {onSuggestReorderLevel && (
                        <button
                          onClick={async () => {
                            const suggested = await onSuggestReorderLevel(item.item_id);
                            if (suggested !== null) {
                              setReorderLevelValues({ ...reorderLevelValues, [item.id]: suggested });
                            }
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Get Smart Suggestion"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="text-gray-600 hover:text-gray-900 cursor-pointer inline-flex items-center gap-1 group"
                      onClick={() => {
                        setEditingReorderLevel(item.id);
                        setReorderLevelValues({ ...reorderLevelValues, [item.id]: item.reorder_level });
                      }}
                    >
                      <span>{Math.floor(item.reorder_level).toLocaleString()}</span>
                      <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-medium">
                  PKR {item.stock_value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(status)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdjustStock?.(item.item_id);
                      }}
                      className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                      title="Adjust Stock"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/items/${item.item_id}?tab=sales-history`);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!loading && stock.length === 0 && (
            <tr>
              <td
                colSpan={10}
                className="px-4 py-6 text-sm text-gray-500 text-center"
              >
                No inventory data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

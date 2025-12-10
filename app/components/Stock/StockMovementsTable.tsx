"use client";

import { ArrowUp, ArrowDown, RefreshCw, Package } from "lucide-react";
import type { StockMovement } from "../../lib/types";

interface StockMovementsTableProps {
  movements: StockMovement[];
  loading?: boolean;
}

export default function StockMovementsTable({ movements, loading }: StockMovementsTableProps) {
  const getMovementIcon = (type: StockMovement['movement_type'], quantity: number) => {
    if (type === 'adjustment') {
      return <RefreshCw className="w-4 h-4" />;
    }
    return quantity > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getMovementColor = (type: StockMovement['movement_type'], quantity: number) => {
    if (type === 'adjustment') {
      return 'text-blue-600 bg-blue-50';
    }
    return quantity > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getMovementLabel = (type: StockMovement['movement_type']) => {
    const labels = {
      purchase: "Purchase",
      sale: "Sale",
      adjustment: "Adjustment",
      return: "Return",
    };
    return labels[type];
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && movements.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading stock movements...</div>
      )}
      <table className="w-full min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Date & Time</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Item</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Type</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Quantity Change</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Previous Stock</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">New Stock</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Reference</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Performed By</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Notes</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {movements.map((movement) => (
            <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {formatDateTime(movement.created_at)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{movement.item?.name || "Unknown Item"}</p>
                    <p className="text-xs text-gray-500">
                      {movement.item?.serial_number || `Item #${movement.item_id}`}
                      {!movement.item && (
                        <span className="ml-2 text-xs text-orange-600 italic">(Item discontinued)</span>
                      )}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getMovementColor(movement.movement_type, movement.quantity)}`}>
                  {getMovementIcon(movement.movement_type, movement.quantity)}
                  {getMovementLabel(movement.movement_type)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm whitespace-nowrap text-right">
                <span className={`font-semibold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {movement.quantity > 0 ? '+' : ''}{Math.floor(movement.quantity).toLocaleString()} {movement.item?.primary_unit || 'units'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-right">
                {Math.floor(movement.previous_stock).toLocaleString()} {movement.item?.primary_unit || 'units'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-semibold">
                {Math.floor(movement.new_stock).toLocaleString()} {movement.item?.primary_unit || 'units'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {movement.reference_type && movement.reference_id ? (
                  <span className="font-mono text-xs">
                    {movement.reference_type}-{movement.reference_id}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {movement.performed_by_name || `User #${movement.performed_by}`}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                {movement.notes || "—"}
              </td>
            </tr>
          ))}
          {!loading && movements.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-6 text-sm text-gray-500 text-center"
              >
                No stock movements found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

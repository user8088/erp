"use client";

import { Eye, Trash2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PurchaseOrder } from "../../lib/types";

interface PurchaseOrdersTableProps {
  orders: PurchaseOrder[];
  loading?: boolean;
  onDelete?: (id: number) => void;
}

export default function PurchaseOrdersTable({ orders, loading, onDelete }: PurchaseOrdersTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      sent: "bg-blue-100 text-blue-800 border-blue-200",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
      received: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    const labels = {
      draft: "Draft",
      sent: "Sent",
      partial: "Partial",
      received: "Received",
      cancelled: "Cancelled",
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && orders.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading purchase orders...</div>
      )}
      <table className="w-full min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">PO Number</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Supplier</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Order Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Expected Delivery</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Total Items</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Total Amount</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => {
            // Format items display with item names and brands: "5 bags Cement (Paidaar), 5 bags Cement (Dewaan)"
            const itemsDisplay = order.items?.map((item) => {
              // Use quantity_received_final if available (for received orders), otherwise quantity_received, fallback to quantity_ordered
              const quantity = Math.floor(
                Number(item.quantity_received_final ?? item.quantity_received ?? item.quantity_ordered) || 0
              );
              const unit = item.item?.primary_unit || 'units';
              const itemName = item.item?.name || `Item #${item.item_id}`;
              const brand = item.item?.brand;
              
              // Include brand name if available to differentiate items with same name
              const displayName = brand ? `${itemName} (${brand})` : itemName;
              return `${quantity} ${unit} ${displayName}`;
            }).join(', ') || '—';

            return (
              <tr
                key={order.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/stock/purchase-orders/${order.id}`)}
              >
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                  {order.po_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {order.supplier_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(order.order_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-medium">
                  {itemsDisplay || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-semibold">
                  PKR {order.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/stock/purchase-orders/${order.id}`);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {order.status === 'draft' && onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete PO ${order.po_number}?`)) {
                            onDelete(order.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {!loading && orders.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-6 text-sm text-gray-500 text-center"
              >
                No purchase orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

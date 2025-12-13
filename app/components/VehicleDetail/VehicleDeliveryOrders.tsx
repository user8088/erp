"use client";

import { useState, useEffect } from "react";
import { vehiclesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Vehicle, VehicleDeliveryOrder } from "../../lib/types";
import { useRouter } from "next/navigation";

interface VehicleDeliveryOrdersProps {
  vehicleId: string;
  vehicle: Vehicle | null;
}

export default function VehicleDeliveryOrders({ vehicleId, vehicle }: VehicleDeliveryOrdersProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<VehicleDeliveryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadOrders();
  }, [vehicleId, page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await vehiclesApi.getVehicleOrders(Number(vehicleId), {
        page,
        per_page: perPage,
      });
      setOrders(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      console.error(e);
      addToast("Failed to load delivery orders.", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const lastPage = Math.ceil(total / perPage);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Delivery Orders</h3>

      {loading ? (
        <div className="text-sm text-gray-500 py-4">Loading delivery orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">No delivery orders found.</div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sale Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Delivery Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Delivery Charges</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/selling/sale-invoices?search=${order.sale_number}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{order.sale_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{order.customer?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={order.delivery_address || ""}>
                      {order.delivery_address || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(order.total_delivery_charges)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > perPage && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} orders
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                >
                  Previous
                </button>
                <span className="px-3 text-sm text-gray-600">
                  Page {page} of {lastPage}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= lastPage}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


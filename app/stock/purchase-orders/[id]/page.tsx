"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Package, FileText, Truck, CheckCircle, XCircle, Receipt } from "lucide-react";
import { useToast } from "../../../components/ui/ToastProvider";
import { purchaseOrdersApi } from "../../../lib/apiClient";
import type { PurchaseOrder } from "../../../lib/types";

// Mock data - replace with real API call
const mockPO: PurchaseOrder = {
  id: 1,
  po_number: "PO-20251207-001",
  supplier_id: null,
  supplier_name: "ABC Suppliers",
  order_date: "2025-12-07",
  expected_delivery_date: "2025-12-15",
  received_date: null,
  status: "sent",
  subtotal: 125000,
  tax_percentage: 18,
  tax_amount: 22500,
  discount: 0,
  total: 147500,
  notes: "Urgent order for construction project",
  created_by: 1,
  created_at: "2025-12-07T10:30:00Z",
  updated_at: "2025-12-07T10:30:00Z",
  items: [
    {
      id: 1,
      purchase_order_id: 1,
      item_id: 1,
      item: {
        id: 1,
        serial_number: "CONST-000001",
        name: "Portland Cement 50kg",
        brand: "Fauji",
        category_id: 1,
        category: { id: 1, name: "Construction Material", alias: "CONST", description: null, created_at: "", updated_at: "" },
        picture_url: null,
        total_profit: 15000,
        last_purchase_price: 850,
        lowest_purchase_price: 820,
        highest_purchase_price: 900,
        selling_price: 1200,
        primary_unit: "bag",
        secondary_unit: "kg",
        conversion_rate: 50,
        created_at: "",
        updated_at: "",
      },
      quantity_ordered: 100,
      quantity_received: 0,
      unit_price: 850,
      total: 85000,
    },
    {
      id: 2,
      purchase_order_id: 1,
      item_id: 2,
      item: {
        id: 2,
        serial_number: "CONST-000002",
        name: "Steel Rebar 12mm",
        brand: "Amreli",
        category_id: 1,
        category: { id: 1, name: "Construction Material", alias: "CONST", description: null, created_at: "", updated_at: "" },
        picture_url: null,
        total_profit: 8500,
        last_purchase_price: 120,
        lowest_purchase_price: 115,
        highest_purchase_price: 130,
        selling_price: 180,
        primary_unit: "piece",
        secondary_unit: "meter",
        conversion_rate: 6,
        created_at: "",
        updated_at: "",
      },
      quantity_ordered: 200,
      quantity_received: 0,
      unit_price: 120,
      total: 24000,
    },
  ],
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPO, setLoadingPO] = useState(true);

  // Fetch purchase order details
  useEffect(() => {
    const fetchPO = async () => {
      const id = Number(params.id);
      if (isNaN(id)) {
        addToast("Invalid purchase order ID", "error");
        router.push("/stock?tab=purchase-orders");
        return;
      }

      setLoadingPO(true);
      try {
        const response = await purchaseOrdersApi.getPurchaseOrder(id);
        setPo(response.purchase_order);
      } catch (error: any) {
        addToast(error.message || "Failed to load purchase order", "error");
        router.push("/stock?tab=purchase-orders");
      } finally {
        setLoadingPO(false);
      }
    };

    fetchPO();
  }, [params.id]);

  useEffect(() => {
    if (!po) return;
    // Initialize receive quantities with remaining quantities
    const initial: Record<number, number> = {};
    po.items?.forEach(item => {
      initial[item.id] = item.quantity_ordered - item.quantity_received;
    });
    setReceiveQuantities(initial);
  }, [po]);

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const config = {
      draft: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: Edit },
      sent: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Truck },
      partial: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Package },
      received: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
    };

    const { color, icon: Icon } = config[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${color}`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReceiveStock = async () => {
    if (!po) return;

    // Filter out items with zero quantity
    const itemsToReceive = Object.entries(receiveQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({
        id: Number(id),
        quantity_received: qty,
      }));

    if (itemsToReceive.length === 0) {
      addToast("Please enter quantities to receive", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await purchaseOrdersApi.receivePurchaseOrder(po.id, {
        items: itemsToReceive,
      });
      
      addToast(response.message || "Stock received successfully", "success");
      setPo(response.purchase_order);
      setIsReceiving(false);
    } catch (error: any) {
      addToast(error.message || "Failed to receive stock", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: PurchaseOrder['status']) => {
    if (!po) return;
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    setLoading(true);
    try {
      const response = await purchaseOrdersApi.updateStatus(po.id, newStatus);
      setPo(response.purchase_order);
      addToast(response.message || `Status updated to ${newStatus}`, "success");
    } catch (error: any) {
      addToast(error.message || "Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loadingPO) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-sm text-gray-500">Loading purchase order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!po) {
    return null;
  }

  const totalReceived = po.items?.reduce((sum, item) => sum + item.quantity_received, 0) || 0;
  const totalOrdered = po.items?.reduce((sum, item) => sum + item.quantity_ordered, 0) || 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/stock?tab=purchase-orders")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
              {getStatusBadge(po.status)}
              {po.journal_entry && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <Receipt className="w-3.5 h-3.5" />
                  Accounted
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Created on {formatDate(po.created_at)}
              {po.journal_entry && (
                <span className="text-green-600 ml-2">
                  • Journal Entry: {po.journal_entry.entry_number}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {po.status === 'draft' && (
              <>
                <button
                  onClick={() => router.push(`/stock/purchase-orders/${po.id}/edit`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleStatusChange('sent')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                >
                  Send to Supplier
                </button>
              </>
            )}
            {(po.status === 'sent' || po.status === 'partial') && !isReceiving && (
              <button
                onClick={() => setIsReceiving(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Receive Stock
              </button>
            )}
            {po.status !== 'cancelled' && po.status !== 'received' && (
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={loading}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Order Items</h2>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ordered</th>
                    {(po.status === 'partial' || po.status === 'received') && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Received</th>
                    )}
                    {isReceiving && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Receive Now</th>
                    )}
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {po.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.item?.picture_url ? (
                            <img
                              src={item.item.picture_url}
                              alt={item.item.name}
                              className="w-10 h-10 rounded object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.item?.name}</p>
                            <p className="text-xs text-gray-500">{item.item?.serial_number}</p>
                            {item.item?.secondary_unit && item.item?.conversion_rate && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                1 {item.item?.primary_unit} = {item.item?.conversion_rate} {item.item?.secondary_unit}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {Math.floor(item.quantity_ordered).toLocaleString()} {item.item?.primary_unit || 'units'}
                      </td>
                      {(po.status === 'partial' || po.status === 'received') && (
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={item.quantity_received === item.quantity_ordered ? 'text-green-600 font-semibold' : 'text-yellow-600 font-medium'}>
                            {Math.floor(item.quantity_received).toLocaleString()} {item.item?.primary_unit || 'units'}
                          </span>
                        </td>
                      )}
                      {isReceiving && (
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity_ordered - item.quantity_received}
                            value={receiveQuantities[item.id] || 0}
                            onChange={(e) => setReceiveQuantities({
                              ...receiveQuantities,
                              [item.id]: Number(e.target.value)
                            })}
                            className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        <div>PKR {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-gray-500">per {item.item?.primary_unit || 'unit'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                        PKR {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Accounting Info Banner */}
            {(po.status === 'sent' || po.status === 'partial') && !po.journal_entry && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Receipt className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-900">Accounting Entry</p>
                    <p className="text-xs text-blue-700 mt-1">
                      When you receive this stock, a journal entry will be automatically created:
                    </p>
                    <div className="mt-2 text-xs text-blue-700 font-mono">
                      DR Inventory → CR Accounts Payable
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isReceiving && (
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsReceiving(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveStock}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300"
                >
                  {loading ? "Processing..." : "Confirm Receipt"}
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  PKR {po.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({po.tax_percentage}%):</span>
                <span className="font-medium text-gray-900">
                  PKR {po.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {po.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    - PKR {po.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total:</span>
                <span className="text-orange-600">
                  PKR {po.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplier Information</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Supplier Name</p>
                <p className="text-sm font-medium text-gray-900">{po.supplier_name}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(po.order_date)}</p>
              </div>
              {po.expected_delivery_date && (
                <div>
                  <p className="text-xs text-gray-500">Expected Delivery</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(po.expected_delivery_date)}</p>
                </div>
              )}
              {po.received_date && (
                <div>
                  <p className="text-xs text-gray-500">Received Date</p>
                  <p className="text-sm font-medium text-green-600">{formatDate(po.received_date)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Total Items</p>
                <p className="text-sm font-medium text-gray-900">{Math.floor(totalOrdered).toLocaleString()} items</p>
              </div>
              {(po.status === 'partial' || po.status === 'received') && (
                <div>
                  <p className="text-xs text-gray-500">Items Received</p>
                  <p className="text-sm font-medium text-green-600">{Math.floor(totalReceived).toLocaleString()} items</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
              <p className="text-sm text-gray-600">{po.notes}</p>
            </div>
          )}

          {/* Journal Entry */}
          {po.journal_entry && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-900">Accounting Entry</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Entry Number</p>
                  <p className="text-sm font-medium text-gray-900">{po.journal_entry.entry_number}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Entry Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {po.journal_entry.entry_date ? formatDate(po.journal_entry.entry_date) : '—'}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-2">Journal Lines</p>
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Account</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Debit</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {po.journal_entry.entries?.map((entry: any) => (
                          <tr key={entry.id}>
                            <td className="px-3 py-2 text-gray-900">
                              {entry.account?.name || entry.account_name || '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {entry.debit > 0 ? `PKR ${Number(entry.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {entry.credit > 0 ? `PKR ${Number(entry.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            PKR {Number(po.journal_entry.total_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            PKR {Number(po.journal_entry.total_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

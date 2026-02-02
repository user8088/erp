"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Trash2, Search } from "lucide-react";
import { useToast } from "../../../components/ui/ToastProvider";
import { itemsApi, purchaseOrdersApi, suppliersApi, type CreatePurchaseOrderPayload } from "../../../lib/apiClient";
import type { Item, Supplier } from "../../../lib/types";
import { checkStockAccountMappingsConfigured } from "../../../lib/stockAccountMappingsClient";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [checkingMappings, setCheckingMappings] = useState(true);
  const [mappingsConfigured, setMappingsConfigured] = useState(false);

  const [formData, setFormData] = useState({
    supplier_name: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    tax_percentage: "18",
    discount: "0",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<Array<{
    item_id: number;
    item?: Item;
    quantity_ordered: number;
    unit_price: number;
  }>>([]);

  const [itemSearch, setItemSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [useSupplierDropdown, setUseSupplierDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Require stock account mappings before allowing PO creation
  useEffect(() => {
    const checkMappings = async () => {
      setCheckingMappings(true);
      try {
        const configured = await checkStockAccountMappingsConfigured();
        setMappingsConfigured(configured);

        if (!configured) {
          addToast(
            "Please configure COA (Stock Account Mappings) before creating purchase orders.",
            "error"
          );
        }
      } catch (error) {
        console.error("Failed to verify Stock Account Mappings:", error);
        addToast("Failed to verify Stock Account Mappings. Please try again.", "error");
      } finally {
        setCheckingMappings(false);
      }
    };

    void checkMappings();
  }, [addToast, router]);

  // Fetch suppliers for dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const response = await suppliersApi.getSuppliers({ per_page: 100, status: 'active' });
        setSuppliers(response.data);
        // If suppliers exist, show dropdown by default
        if (response.data.length > 0) {
          setUseSupplierDropdown(true);
        }
      } catch (error) {
        console.error("Failed to load suppliers:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Pre-populate from query params (e.g., from low stock alerts)
  useEffect(() => {
    const itemId = searchParams.get('item_id');
    const quantity = searchParams.get('quantity');
    
    if (itemId && quantity) {
      // In real implementation, fetch item details and add to line items
    }
  }, [searchParams]);

  const handleItemSearch = async (query: string) => {
    setItemSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await itemsApi.getItems({ search: query, per_page: 10 });
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching items:", error);
    }
  };

  const handleAddItem = (item: Item) => {
    // Check if item already exists
    if (lineItems.some(li => li.item_id === item.id)) {
      addToast("Item already added to this order", "error");
      return;
    }

    setLineItems([...lineItems, {
      item_id: item.id,
      item: item,
      quantity_ordered: 1,
      unit_price: item.last_purchase_price || 0,
    }]);
    setItemSearch("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: 'quantity_ordered' | 'unit_price', value: string) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]: Number(value),
    };
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0);
    const taxAmount = (subtotal * Number(formData.tax_percentage)) / 100;
    const discount = Number(formData.discount);
    const total = subtotal + taxAmount - discount;

    return { subtotal, taxAmount, discount, total };
  };

  const { subtotal, taxAmount, discount, total } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'sent') => {
    e.preventDefault();

    if (checkingMappings) {
      addToast("Checking Stock Account Mappings… please wait.", "info");
      return;
    }

    if (!mappingsConfigured) {
      addToast("Please configure Stock Account Mappings before creating purchase orders.", "error");
      router.push("/settings/stock-accounts");
      return;
    }

    if (!formData.supplier_name.trim()) {
      addToast("Please enter supplier name", "error");
      return;
    }

    if (lineItems.length === 0) {
      addToast("Please add at least one item", "error");
      return;
    }

    setLoading(true);
    try {
      const payload: CreatePurchaseOrderPayload = {
        supplier_name: formData.supplier_name,
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        tax_percentage: Number(formData.tax_percentage),
        discount: Number(formData.discount),
        notes: formData.notes || null,
        items: lineItems.map(item => ({
          item_id: item.item_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
        })),
      };

      // Create the purchase order
      const result = await purchaseOrdersApi.createPurchaseOrder(payload);
      
      // If status should be 'sent', update it
      if (status === 'sent' && result.purchase_order.status === 'draft') {
        await purchaseOrdersApi.updateStatus(result.purchase_order.id, 'sent');
      }
      
      addToast(result.message || `Purchase order ${status === 'draft' ? 'saved as draft' : 'created and sent'}`, "success");
      router.push("/stock?tab=purchase-orders");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create purchase order";
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {checkingMappings && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">Checking Stock Account Mappings…</p>
        </div>
      )}

      {!checkingMappings && !mappingsConfigured && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <p className="text-sm font-semibold text-yellow-900">COA configuration required</p>
          <p className="mt-1 text-xs text-yellow-800">
            Configure Stock Account Mappings (Inventory: Asset, Accounts Payable: Liability) before creating a Purchase Order.
          </p>
          <button
            type="button"
            onClick={() => router.push("/settings/stock-accounts")}
            className="mt-3 inline-flex items-center rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-900 hover:bg-yellow-50"
          >
            Configure COA
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new purchase order to restock inventory</p>
      </div>

      <form className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Order Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              
              {/* Toggle between dropdown and text input */}
              {suppliers.length > 0 && (
                <div className="mb-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSupplierDropdown}
                      onChange={(e) => setUseSupplierDropdown(e.target.checked)}
                      className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    Select from existing suppliers
                  </label>
                </div>
              )}
              
              {useSupplierDropdown && suppliers.length > 0 ? (
                <select
                  value={formData.supplier_name}
                  onChange={(e) => {
                    const selected = suppliers.find(s => s.name === e.target.value);
                    setFormData({ ...formData, supplier_name: selected?.name || e.target.value });
                  }}
                  disabled={loadingSuppliers}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name} ({supplier.serial_number})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter supplier name"
                  required
                />
              )}
              <p className="mt-1 text-xs text-gray-500">
                {suppliers.length > 0 
                  ? "Select from existing suppliers or enter a new name"
                  : "Supplier name (you can add suppliers from the Suppliers module)"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Percentage (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tax_percentage}
                onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (PKR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Order Items</h2>
          </div>

          {/* Item Search */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search and Add Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => handleItemSearch(e.target.value)}
                onFocus={() => itemSearch.length >= 2 && setShowSearchResults(true)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Search by item name or serial number..."
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.serial_number} • {item.brand || "No brand"} • Last Price: PKR {item.last_purchase_price?.toFixed(2) || "N/A"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          {lineItems.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price (PKR)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total (PKR)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-900">{item.item?.name}</p>
                        <p className="text-xs text-gray-500">{item.item?.serial_number}</p>
                        {item.item?.secondary_unit && item.item?.conversion_rate && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            1 {item.item?.primary_unit} = {item.item?.conversion_rate} {item.item?.secondary_unit}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity_ordered}
                            onChange={(e) => handleLineItemChange(index, 'quantity_ordered', e.target.value)}
                            className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-600 font-medium min-w-fit">
                            {item.item?.primary_unit || 'units'}
                          </span>
                        </div>
                        {item.item?.secondary_unit && item.item?.conversion_rate && (
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            ({(item.quantity_ordered * item.item.conversion_rate).toFixed(2)} {item.item.secondary_unit})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                            className="w-32 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <span className="text-xs text-gray-500">per {item.item?.primary_unit || 'unit'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {(item.quantity_ordered * item.unit_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm text-gray-500">No items added yet. Search and add items to this order.</p>
            </div>
          )}
        </div>

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  PKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({formData.tax_percentage}%):</span>
                <span className="font-medium text-gray-900">
                  PKR {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {Number(formData.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    - PKR {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total:</span>
                <span className="text-orange-600">
                  PKR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={loading || checkingMappings || !mappingsConfigured}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'sent')}
            disabled={loading || checkingMappings || !mappingsConfigured}
            className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create & Send Order"}
          </button>
        </div>
      </form>
    </div>
  );
}

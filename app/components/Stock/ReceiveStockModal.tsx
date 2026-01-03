"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Package, CheckCircle, FileText, DollarSign, Upload as UploadIcon, ArrowRight } from "lucide-react";
import { accountsApi } from "../../lib/apiClient";
import type { PurchaseOrder, PurchaseOrderItem, Account, Invoice } from "../../lib/types";
import ReceiveItemRow from "./ReceiveItemRow";
import OtherCostsSection from "./OtherCostsSection";
import SupplierInvoiceUpload from "./SupplierInvoiceUpload";

interface OtherCost {
  id: string;
  description: string;
  amount: number;
  account_id?: number | null;
}

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  onReceive: (payload: {
    items: Array<{
      id: number;
      quantity_received: number;
      final_unit_price: number;
    }>;
    other_costs?: Array<{
      description: string;
      amount: number;
      account_id?: number | null;
    }>;
    delivery_charge?: number;
    supplier_invoice_file?: File | null;
  }) => Promise<{
    purchase_order: PurchaseOrder;
    supplier_invoice?: Invoice;
    message: string;
  }>;
}

type Step = 'items' | 'costs' | 'invoice' | 'review';

export default function ReceiveStockModal({
  isOpen,
  onClose,
  purchaseOrder,
  onReceive,
}: ReceiveStockModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('items');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Item state
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [finalPrices, setFinalPrices] = useState<Record<number, number>>({});
  
  // Other costs
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([]);
  
  // Delivery charge
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  
  // Invoice upload
  const [supplierInvoiceFile, setSupplierInvoiceFile] = useState<File | null>(null);
  
  // Accounts for other costs
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Fetch accounts for other costs
  useEffect(() => {
    if (isOpen && currentStep === 'costs') {
      const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
          const response = await accountsApi.getAccounts({
            company_id: 1,
            per_page: 1000,
            is_group: false,
          });
          setAccounts(response.data);
        } catch (error) {
          console.error("Failed to fetch accounts:", error);
        } finally {
          setLoadingAccounts(false);
        }
      };
      fetchAccounts();
    }
  }, [isOpen, currentStep]);

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen && purchaseOrder.items) {
      const initialChecked = new Set<number>();
      const initialQuantities: Record<number, number> = {};
      const initialPrices: Record<number, number> = {};

      purchaseOrder.items.forEach(item => {
        const qtyOrdered = Number(item.quantity_ordered) || 0;
        const qtyReceived = Number(item.quantity_received) || 0;
        const remaining = qtyOrdered - qtyReceived;
        if (remaining > 0) {
          initialChecked.add(item.id);
          initialQuantities[item.id] = remaining;
          initialPrices[item.id] = Number(item.unit_price) || 0;
        }
      });

      setCheckedItems(initialChecked);
      setQuantities(initialQuantities);
      setFinalPrices(initialPrices);
      setOtherCosts([]);
      setDeliveryCharge(0);
      setSupplierInvoiceFile(null);
      setCurrentStep('items');
      setError(null);
    }
  }, [isOpen, purchaseOrder]);

  const handleItemCheck = (itemId: number, checked: boolean) => {
    const newChecked = new Set(checkedItems);
    if (checked) {
      newChecked.add(itemId);
      const item = purchaseOrder.items?.find(i => i.id === itemId);
      if (item) {
        const qtyOrdered = Number(item.quantity_ordered) || 0;
        const qtyReceived = Number(item.quantity_received) || 0;
        const remaining = qtyOrdered - qtyReceived;
        setQuantities({ ...quantities, [itemId]: remaining });
        setFinalPrices({ ...finalPrices, [itemId]: Number(item.unit_price) || 0 });
      }
    } else {
      newChecked.delete(itemId);
      const newQuantities = { ...quantities };
      const newPrices = { ...finalPrices };
      delete newQuantities[itemId];
      delete newPrices[itemId];
      setQuantities(newQuantities);
      setFinalPrices(newPrices);
    }
    setCheckedItems(newChecked);
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setQuantities({ ...quantities, [itemId]: quantity });
  };

  const handlePriceChange = (itemId: number, price: number) => {
    setFinalPrices({ ...finalPrices, [itemId]: price });
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let itemsSubtotal = 0;
    const checkedItemsList = Array.from(checkedItems);
    
    checkedItemsList.forEach(itemId => {
      const qty = quantities[itemId] || 0;
      const price = finalPrices[itemId] || 0;
      itemsSubtotal += qty * price;
    });

    const otherCostsTotal = otherCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const deliveryChargeAmount = deliveryCharge || 0;
    const finalTotal = itemsSubtotal - otherCostsTotal + deliveryChargeAmount;

    return {
      itemsSubtotal,
      otherCostsTotal,
      deliveryChargeAmount,
      finalTotal,
    };
  }, [checkedItems, quantities, finalPrices, otherCosts, deliveryCharge]);

  const totals = calculateTotals();

  const canProceedToCosts = checkedItems.size > 0;
  const canProceedToInvoice = true; // Costs are optional
  const canProceedToReview = true; // Invoice is optional

  const handleNext = () => {
    setError(null);
    if (currentStep === 'items' && canProceedToCosts) {
      setCurrentStep('costs');
    } else if (currentStep === 'costs' && canProceedToInvoice) {
      setCurrentStep('invoice');
    } else if (currentStep === 'invoice' && canProceedToReview) {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 'review') {
      setCurrentStep('invoice');
    } else if (currentStep === 'invoice') {
      setCurrentStep('costs');
    } else if (currentStep === 'costs') {
      setCurrentStep('items');
    }
  };

  const handleSubmit = async () => {
    if (checkedItems.size === 0) {
      setError("Please select at least one item to receive");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const itemsPayload = Array.from(checkedItems).map(itemId => ({
        id: itemId,
        quantity_received: quantities[itemId] || 0,
        final_unit_price: finalPrices[itemId] || 0,
      }));

      const otherCostsPayload = otherCosts.length > 0 ? otherCosts.map(cost => ({
        description: cost.description,
        amount: cost.amount,
        account_id: cost.account_id || null,
      })) : undefined;

      await onReceive({
        items: itemsPayload,
        other_costs: otherCostsPayload,
        delivery_charge: deliveryCharge > 0 ? deliveryCharge : undefined,
        supplier_invoice_file: supplierInvoiceFile || undefined,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive stock");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const checkedItemsList = purchaseOrder.items?.filter(item => checkedItems.has(item.id)) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Receive Stock</h2>
              <p className="text-sm text-gray-500 mt-1">
                {purchaseOrder.po_number} - {purchaseOrder.supplier_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {(['items', 'costs', 'invoice', 'review'] as Step[]).map((step, index) => {
              const stepNames = {
                items: 'Items',
                costs: 'Costs',
                invoice: 'Invoice',
                review: 'Review',
              };
              const isActive = currentStep === step;
              const isCompleted = ['items', 'costs', 'invoice', 'review'].indexOf(currentStep) > index;
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex items-center flex-1">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        isActive
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`ml-2 text-xs font-medium ${
                        isActive ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {stepNames[step]}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Items */}
          {currentStep === 'items' && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Select Items to Receive</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12"></th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ordered</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Final Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items
                      ?.filter(item => {
                        const qtyOrdered = Number(item.quantity_ordered) || 0;
                        const qtyReceived = Number(item.quantity_received) || 0;
                        return qtyOrdered - qtyReceived > 0;
                      })
                      .map((item) => (
                        <ReceiveItemRow
                          key={item.id}
                          item={item}
                          isChecked={checkedItems.has(item.id)}
                          onCheckChange={(checked) => handleItemCheck(item.id, checked)}
                          quantity={quantities[item.id] || 0}
                          onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
                          finalPrice={finalPrices[item.id] || item.unit_price}
                          onFinalPriceChange={(price) => handlePriceChange(item.id, price)}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Other Costs */}
          {currentStep === 'costs' && (
            <div className="space-y-6">
              <OtherCostsSection
                costs={otherCosts}
                onCostsChange={setOtherCosts}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
              />
              
              {/* Delivery Charge Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Delivery Charge</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Delivery charge from supplier (increases amount owed to supplier)
                  </p>
                </div>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Charge (PKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryCharge || ""}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the delivery charge amount charged by the supplier
                  </p>
                  {deliveryCharge > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Delivery Charge:</span>
                        <span className="text-sm font-semibold text-green-700">
                          + PKR {deliveryCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Supplier Invoice */}
          {currentStep === 'invoice' && (
            <div>
              <SupplierInvoiceUpload
                file={supplierInvoiceFile}
                onFileChange={setSupplierInvoiceFile}
              />
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Review & Confirm</h3>
                
                {/* Items Summary */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Items to Receive</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Quantity</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {checkedItemsList.map((item) => {
                          const qty = quantities[item.id] || 0;
                          const price = finalPrices[item.id] || 0;
                          const total = qty * price;
                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.item?.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                {qty.toLocaleString()} {item.item?.primary_unit || 'units'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                PKR {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                                PKR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Other Costs Summary */}
                {otherCosts.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Other Costs</h4>
                    <p className="text-xs text-gray-500 mb-3">Costs that reduce the amount owed to supplier</p>
                    <div className="space-y-2">
                      {otherCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <p className="text-sm text-gray-900">{cost.description}</p>
                            {cost.account_id && (
                              <p className="text-xs text-gray-500">
                                Account: {accounts.find(a => a.id === cost.account_id)?.name || 'N/A'}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-medium text-red-600">
                            - PKR {cost.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Charge Summary */}
                {totals.deliveryChargeAmount > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Delivery Charge</h4>
                    <p className="text-xs text-gray-500 mb-3">Charge from supplier that increases the amount owed</p>
                    <div className="flex items-center justify-between py-2">
                      <p className="text-sm text-gray-900">Delivery Charge</p>
                      <p className="text-sm font-medium text-green-600">
                        + PKR {totals.deliveryChargeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Supplier Invoice */}
                {supplierInvoiceFile && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Supplier Invoice</h4>
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{supplierInvoiceFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(supplierInvoiceFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Final Totals */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Items Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        PKR {totals.itemsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {totals.otherCostsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Other Costs:</span>
                        <span className="font-medium text-red-600">
                          - PKR {totals.otherCostsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {totals.deliveryChargeAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Charge:</span>
                        <span className="font-medium text-green-600">
                          + PKR {totals.deliveryChargeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-semibold pt-2 border-t border-orange-300">
                      <span className="text-gray-900">Final Amount Owed:</span>
                      <span className="text-orange-600">
                        PKR {totals.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accounting Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-900 mb-2">Accounting Entry Preview:</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>DR Inventory: PKR {totals.itemsSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    {totals.otherCostsTotal > 0 && (
                      <p>DR Expense Accounts: PKR {totals.otherCostsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    )}
                    {totals.deliveryChargeAmount > 0 && (
                      <p className="text-green-700">Note: Delivery charge increases Accounts Payable</p>
                    )}
                    <p>CR Accounts Payable: PKR {totals.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={currentStep === 'items' ? onClose : handleBack}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:bg-gray-100"
          >
            {currentStep === 'items' ? 'Cancel' : 'Back'}
          </button>
          <div className="flex items-center gap-3">
            {currentStep !== 'review' ? (
              <button
                onClick={handleNext}
                disabled={loading || (currentStep === 'items' && !canProceedToCosts)}
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || checkedItems.size === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Confirm & Receive Stock'}
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


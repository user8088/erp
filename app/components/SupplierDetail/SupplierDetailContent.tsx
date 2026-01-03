"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SupplierDetailTabs from "./SupplierDetailTabs";
import SupplierDetailsForm from "./SupplierDetailsForm";
import SupplierPaymentModal, { type PaymentData } from "../Suppliers/SupplierPaymentModal";
import type { Supplier, PurchaseOrder, Account, SupplierPayment } from "../../lib/types";
import { Package, ShoppingCart, CreditCard, Receipt } from "lucide-react";
import { purchaseOrdersApi, accountsApi, suppliersApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";

// Simple date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

interface SupplierDetailContentProps {
  supplierId: string;
  supplier: Supplier | null;
  onSupplierChange: (supplier: Supplier) => void;
  saveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function SupplierDetailContent({
  supplierId,
  supplier,
  onSupplierChange,
  saveSignal,
  onSavingChange,
}: SupplierDetailContentProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("supplier-details");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  // Track which tabs have been loaded to prevent unnecessary API calls
  const loadedTabsRef = useRef<Set<string>>(new Set());
  const currentSupplierIdRef = useRef<number | null>(null);

  const fetchPurchaseOrders = useCallback(async (force = false) => {
    if (!supplier) return;
    
    // Reset loaded state if supplier changed
    if (currentSupplierIdRef.current !== supplier.id) {
      loadedTabsRef.current.clear();
      currentSupplierIdRef.current = supplier.id;
    }
    
    // Only fetch if not already loaded or if forced
    if (!force && loadedTabsRef.current.has("purchase-orders")) {
      return;
    }
    
    setLoadingPOs(true);
    try {
      const response = await purchaseOrdersApi.getPurchaseOrders({
        supplier_id: supplier.id,
        per_page: 50,
        sort_by: "order_date",
        sort_order: "desc",
      });
      setPurchaseOrders(response.data);
      loadedTabsRef.current.add("purchase-orders");
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
      setPurchaseOrders([]);
    } finally {
      setLoadingPOs(false);
    }
  }, [supplier]);

  // Fetch payment accounts (asset accounts for payment)
  const fetchPaymentAccounts = useCallback(async () => {
    try {
      const response = await accountsApi.getAccounts({
        company_id: 1,
        root_type: 'asset',
        is_group: false,
        per_page: 1000,
      });
      // Filter to only show relevant payment accounts
      const filtered = response.data.filter(acc => 
        !acc.is_disabled && 
        (acc.name.toLowerCase().includes('cash') || 
         acc.name.toLowerCase().includes('bank') || 
         acc.name.toLowerCase().includes('jazzcash') || 
         acc.name.toLowerCase().includes('easypaisa') ||
         acc.number?.startsWith('1'))
      );
      
      // Fetch balances for each account
      const accountsWithBalances = await Promise.all(
        filtered.map(async (account) => {
          try {
            const balanceResponse = await accountsApi.getAccountBalance(account.id);
            return {
              ...account,
              balance: balanceResponse.balance,
            };
          } catch (error) {
            console.error(`Failed to fetch balance for account ${account.id}:`, error);
            return {
              ...account,
              balance: 0,
            };
          }
        })
      );
      
      setPaymentAccounts(accountsWithBalances);
    } catch (error) {
      console.error("Failed to fetch payment accounts:", error);
      addToast("Failed to load payment accounts", "error");
    }
  }, [addToast]);

  // Fetch payment history and balance
  const fetchPayments = useCallback(async (force = false) => {
    if (!supplier) return;
    
    // Reset loaded state if supplier changed
    if (currentSupplierIdRef.current !== supplier.id) {
      loadedTabsRef.current.clear();
      currentSupplierIdRef.current = supplier.id;
    }
    
    // Only fetch if not already loaded or if forced
    if (!force && loadedTabsRef.current.has("payments")) {
      return;
    }
    
    setLoadingPayments(true);
    try {
      // Fetch payments
      const paymentsResponse = await suppliersApi.getPayments(supplier.id, {
        per_page: 100,
        sort_by: 'payment_date',
        sort_order: 'desc'
      });
      
      setPayments(paymentsResponse.payments);
      setTotalPaid(paymentsResponse.summary.total_paid);
      setTotalPurchased(paymentsResponse.summary.total_received);
      setOutstandingBalance(paymentsResponse.summary.outstanding_balance);
      loadedTabsRef.current.add("payments");
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      addToast("Failed to load payment history", "error");
      setPayments([]);
      
      // Try to at least get the balance
      try {
        const balanceResponse = await suppliersApi.getBalance(supplier.id);
        setTotalPaid(balanceResponse.total_paid);
        setTotalPurchased(balanceResponse.total_purchased);
        setOutstandingBalance(balanceResponse.outstanding_balance);
      } catch (balanceError) {
        console.error("Failed to fetch balance:", balanceError);
      }
    } finally {
      setLoadingPayments(false);
    }
  }, [supplier, addToast]);

  // Fetch purchase orders when tab is active - only fetch once per tab
  useEffect(() => {
    if (activeTab === "purchase-orders" || activeTab === "items-supplied") {
      fetchPurchaseOrders();
    } else if (activeTab === "payments") {
      fetchPayments();
    }
  }, [activeTab, fetchPurchaseOrders, fetchPayments]);

  // Reset loaded state when supplier changes
  useEffect(() => {
    if (supplier && currentSupplierIdRef.current !== supplier.id) {
      loadedTabsRef.current.clear();
      currentSupplierIdRef.current = supplier.id;
    }
  }, [supplier]);

  // Extract unique items from purchase orders and aggregate quantities
  const suppliedItems = supplier ? purchaseOrders
    .reduce((itemsMap, po) => {
      if (!po.items) return itemsMap;
      
      po.items.forEach(poItem => {
        const itemName = poItem.item?.name || `Item #${poItem.item_id}`;
        const primaryUnit = poItem.item?.primary_unit || 'units';
        const secondaryUnit = poItem.item?.secondary_unit;
        const conversionRate = poItem.item?.conversion_rate;
        const existing = itemsMap.get(poItem.item_id);
        const quantity = Number(poItem.quantity_ordered) || 0;
        
        if (existing) {
          existing.total_quantity += quantity;
          // Update last ordered date if this PO is more recent
          if (new Date(po.order_date) > new Date(existing.last_ordered)) {
            existing.last_ordered = po.order_date;
          }
        } else {
          itemsMap.set(poItem.item_id, {
            item_id: poItem.item_id,
            item_name: itemName,
            total_quantity: quantity,
            primary_unit: primaryUnit,
            secondary_unit: secondaryUnit,
            conversion_rate: conversionRate,
            last_ordered: po.order_date,
          });
        }
      });
      
      return itemsMap;
    }, new Map<number, { 
      item_id: number; 
      item_name: string; 
      total_quantity: number; 
      primary_unit: string;
      secondary_unit?: string | null;
      conversion_rate?: number | null;
      last_ordered: string 
    }>())
    .values() : [];
  
  const suppliedItemsArray = Array.from(suppliedItems);


  // Handle payment submission
  const handlePaymentSubmit = async (paymentData: PaymentData) => {
    if (!supplier) return;
    try {
      const response = await suppliersApi.createPayment(supplier.id, paymentData);
      
      addToast(response.message || "Payment recorded successfully", "success");
      
      // Force refresh data after payment (data has changed)
      loadedTabsRef.current.delete("payments");
      fetchPayments(true);
      // Purchase orders might also be affected if payment was linked to a PO
      loadedTabsRef.current.delete("purchase-orders");
      if (activeTab === "purchase-orders" || activeTab === "items-supplied") {
        fetchPurchaseOrders(true);
      }
    } catch (error) {
      // Parse error to extract meaningful message
      let errorMessage = "Failed to record payment";
      
      if (error && typeof error === "object") {
        // Check for backend error response structure
        if ("message" in error && typeof error.message === "string") {
          errorMessage = error.message;
        } else if ("data" in error) {
          const errorData = (error as { data: unknown }).data;
          if (errorData && typeof errorData === "object") {
            if ("message" in errorData && typeof errorData.message === "string") {
              errorMessage = errorData.message;
            } else if ("errors" in errorData) {
              const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
              const firstError = Object.values(backendErrors)[0]?.[0];
              if (firstError) {
                errorMessage = firstError;
              }
            }
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Show user-friendly error message
      const lowerMessage = errorMessage.toLowerCase();
      
      if (lowerMessage.includes("negative balance") || 
          lowerMessage.includes("insufficient funds") ||
          lowerMessage.includes("balance cannot go negative") ||
          lowerMessage.includes("would result in negative balance")) {
        // Extract account info if available
        const accountMatch = errorMessage.match(/account[:\s]+([^,\.]+)/i);
        const balanceMatch = errorMessage.match(/PKR\s*([\d,]+\.?\d*)/i) || 
                            errorMessage.match(/([\d,]+\.?\d*)\s*PKR/i);
        
        if (accountMatch && balanceMatch) {
          const accountName = accountMatch[1].trim();
          const availableBalance = balanceMatch[1].replace(/,/g, '');
          addToast(
            `Insufficient balance in ${accountName}. Available: PKR ${Number(availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Payment would result in negative balance.`,
            "error"
          );
        } else {
          addToast(`Insufficient balance: ${errorMessage}`, "error");
        }
      } else if (lowerMessage.includes("exceeds outstanding balance")) {
        // Extract maximum allowed amount
        const amountMatches = errorMessage.match(/PKR\s*([\d,]+\.?\d*)/g);
        if (amountMatches && amountMatches.length >= 2) {
          const maxAmount = amountMatches[1].replace(/PKR\s*|,/g, '');
          addToast(
            `Payment amount exceeds outstanding balance. Maximum allowed: PKR ${Number(maxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            "error"
          );
        } else {
          addToast(errorMessage, "error");
        }
      } else {
      addToast(errorMessage, "error");
      }
      
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  // Auto-detect payment account
  const handleAutoDetectPaymentAccount = async (): Promise<number | null> => {
    try {
      const response = await suppliersApi.autoDetectPaymentAccount();
      
      if (response.detected_account) {
        addToast(`Auto-detected: ${response.detected_account.name} (${response.confidence} confidence)`, "success");
        return response.detected_account.id;
      }
      
      addToast(response.message || "No suitable payment account found", "info");
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to auto-detect payment account";
      addToast(errorMessage, "error");
      return null;
    }
  };

  // Open payment modal and fetch accounts
  const handleOpenPaymentModal = () => {
    fetchPaymentAccounts();
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="flex-1">
      <SupplierDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "supplier-details" && (
          <SupplierDetailsForm
            supplierId={supplierId}
            supplier={supplier}
            onSupplierUpdated={onSupplierChange}
            externalSaveSignal={saveSignal}
            onSavingChange={onSavingChange}
          />
        )}

        {activeTab === "purchase-orders" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Purchase Orders</h2>
            
            {!supplier ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading supplier...</p>
              </div>
            ) : loadingPOs ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading purchase orders...</p>
              </div>
            ) : purchaseOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PO #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{po.po_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {po.order_date ? formatDate(po.order_date) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            po.status === 'received' ? 'bg-green-100 text-green-800' :
                            po.status === 'sent' || po.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            po.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                            po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{po.items?.length || 0} item(s)</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          PKR {po.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm">No purchase orders from this supplier yet.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Purchase orders will appear here when you create them.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {!supplier ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading supplier...</p>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Payment History</h2>
              <button
                onClick={handleOpenPaymentModal}
                disabled={outstandingBalance <= 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Make Payment
              </button>
            </div>

            {/* Outstanding Balance Card */}
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Outstanding Balance</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">
                    PKR {outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Total Received: PKR {totalPurchased.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Paid: PKR {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Receipt className="w-12 h-12 text-orange-300" />
              </div>
            </div>

            {/* Payment History Table */}
            {loadingPayments ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading payment history...</p>
              </div>
            ) : payments.length > 0 ? (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paid From</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Journal Entry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {payment.payment_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.payment_date ? formatDate(payment.payment_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {payment.invoice_number || (
                            <span className="text-gray-400 italic text-xs">No invoice</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.payment_account?.name || payment.payment_account_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                          PKR {Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {payment.journal_entry?.entry_number ? (
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              <Receipt className="w-3 h-3" />
                              {payment.journal_entry.entry_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm">No payments recorded yet.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Payment history will appear here after you make payments.
                </p>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {activeTab === "items-supplied" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {!supplier ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading supplier...</p>
              </div>
            ) : (
              <>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Items & Products Supplied</h2>
            
            {supplier.items_supplied && (
              <div className="prose prose-sm max-w-none mb-8">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{supplier.items_supplied}</p>
              </div>
            )}

            {/* Historical Items Table */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Items Purchased From This Supplier</h3>
              
              {loadingPOs ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Loading items history...</p>
                </div>
              ) : suppliedItemsArray.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item Name</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Ordered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {suppliedItemsArray.map((item) => (
                        <tr key={item.item_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            <div className="font-semibold text-gray-900">
                              {Math.floor(item.total_quantity).toLocaleString()} {item.primary_unit}
                            </div>
                            {item.secondary_unit && item.conversion_rate && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                ({Math.floor(item.total_quantity * item.conversion_rate).toLocaleString()} {item.secondary_unit})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.last_ordered ? formatDate(item.last_ordered) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm">No items history yet.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Items will show here once you receive purchase orders from this supplier.
                  </p>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        {activeTab === "more-information" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">More Information</h2>
            <p className="text-sm text-gray-500">Additional supplier information will appear here.</p>
            </div>
        )}
        {activeTab === "settings" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Supplier Settings</h2>
            <p className="text-sm text-gray-500">Supplier-specific settings will appear here.</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {supplier && (
      <SupplierPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        supplierName={supplier.name}
        supplierId={supplier.id}
        outstandingBalance={outstandingBalance}
        paymentAccounts={paymentAccounts}
        onPaymentSubmit={handlePaymentSubmit}
        onAutoDetectPaymentAccount={handleAutoDetectPaymentAccount}
      />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import SupplierDetailTabs from "./SupplierDetailTabs";
import SupplierDetailsForm from "./SupplierDetailsForm";
import SupplierPaymentModal, { type PaymentData } from "../Suppliers/SupplierPaymentModal";
import type { Supplier, PurchaseOrder, Account, SupplierPayment, SupplierDailyTotalsEntry } from "../../lib/types";
import { Package, ShoppingCart, CreditCard, Receipt, DollarSign, TrendingUp, Eye, Download } from "lucide-react";
import { purchaseOrdersApi, accountsApi, suppliersApi, invoicesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  checkStockAccountMappingsConfigured,
  handleStockAccountMappingError,
} from "../../lib/stockAccountMappingsClient";

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
  const router = useRouter();
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
  const [dailyTotals, setDailyTotals] = useState<SupplierDailyTotalsEntry[]>([]);
  const [loadingDailyTotals, setLoadingDailyTotals] = useState(false);
  const [checkingMappings, setCheckingMappings] = useState(false);

  // Track which tabs have been loaded to prevent unnecessary API calls
  const loadedTabsRef = useRef<Set<string>>(new Set());
  const currentSupplierIdRef = useRef<number | null>(null);

  const getPurchaseOrderItemsDisplay = useCallback((po: PurchaseOrder) => {
    const summary = typeof po.items_summary === "string" ? po.items_summary.trim() : "";
    if (summary) return summary;

    if (typeof po.items_count === "number") {
      return `${po.items_count} item(s)`;
    }

    return `${po.items?.length ?? 0} item(s)`;
  }, []);

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

  const fetchDailyTotals = useCallback(async (force = false) => {
    if (!supplier) return;

    if (currentSupplierIdRef.current !== supplier.id) {
      loadedTabsRef.current.clear();
      currentSupplierIdRef.current = supplier.id;
    }

    if (!force && loadedTabsRef.current.has("daily-totals")) {
      return;
    }

    setLoadingDailyTotals(true);
    try {
      const response = await suppliersApi.getDailyTotals(supplier.id);
      setDailyTotals(response.data);
      // Use backend summary values (authoritative)
      setTotalPurchased(response.summary.total_purchased);
      setTotalPaid(response.summary.total_paid);
      setOutstandingBalance(response.summary.outstanding_balance);
      loadedTabsRef.current.add("daily-totals");
    } catch (error: unknown) {
      // Silently ignore 404 - endpoint not implemented yet on backend
      // Chart will fall back to derived data from POs/payments
      const status = (error as { status?: number }).status;
      if (status !== 404) {
        console.error("Failed to fetch daily totals:", error);
      }
    } finally {
      setLoadingDailyTotals(false);
    }
  }, [supplier]);

  // Fetch purchase orders when tab is active - only fetch once per tab
  useEffect(() => {
    if (activeTab === "purchase-orders" || activeTab === "items-supplied") {
      fetchPurchaseOrders();
    } else if (activeTab === "payments") {
      fetchPayments();
      fetchDailyTotals();
      fetchPurchaseOrders();
    }
  }, [activeTab, fetchPurchaseOrders, fetchPayments, fetchDailyTotals]);

  // Reset loaded state when supplier changes
  useEffect(() => {
    if (supplier && currentSupplierIdRef.current !== supplier.id) {
      loadedTabsRef.current.clear();
      currentSupplierIdRef.current = supplier.id;
    }
  }, [supplier]);

  const handleDownloadInvoice = useCallback(async (invoiceId?: number, poId?: number) => {
    try {
      let blob: Blob | null = null;
      let filename = "supplier-invoice";

      if (invoiceId) {
        blob = await invoicesApi.downloadInvoice(invoiceId);
        filename = `supplier-invoice-${invoiceId}`;
      } else if (poId) {
        blob = await purchaseOrdersApi.downloadSupplierInvoiceAttachment(poId);
        filename = `supplier-invoice-attachment-${poId}`;
      }

      if (!blob) {
        addToast("No invoice available for download", "error");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download supplier invoice:", error);
      addToast("Failed to download supplier invoice", "error");
    }
  }, [addToast]);

  const handlePreviewInvoice = useCallback(async (invoiceId?: number, poId?: number) => {
    try {
      let blob: Blob | null = null;

      if (invoiceId) {
        blob = await invoicesApi.downloadInvoice(invoiceId);
      } else if (poId) {
        blob = await purchaseOrdersApi.downloadSupplierInvoiceAttachment(poId);
      }

      if (!blob) {
        addToast("No invoice available for preview", "error");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Failed to preview supplier invoice:", error);
      addToast("Failed to preview supplier invoice", "error");
    }
  }, [addToast]);

  // Extract unique items from purchase orders and aggregate quantities + costs + invoice references
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
        const lineCost = Number(poItem.total ?? (Number(poItem.unit_price) || 0) * quantity);
        const hasInvoice = Boolean(
          po.supplier_invoice?.id ||
          po.supplier_invoice_id ||
          po.supplier_invoice_number ||
          po.supplier_invoice_pdf_path ||
          po.supplier_invoice?.pdf_path ||
          po.supplier_invoice_path
        );
        const invoiceNumber =
          po.supplier_invoice_number ||
          po.supplier_invoice?.invoice_number ||
          null;
        const invoiceId = po.supplier_invoice_id || po.supplier_invoice?.id || undefined;

        if (existing) {
          existing.total_quantity += quantity;
          existing.total_cost += lineCost;
          if (hasInvoice) {
            existing.invoice_count += 1;
          }
          // Update last ordered date if this PO is more recent
          if (new Date(po.order_date) > new Date(existing.last_ordered)) {
            existing.last_ordered = po.order_date;
            existing.latest_invoice_number = invoiceNumber;
            existing.latest_invoice_id = invoiceId;
            existing.latest_po_id = po.id;
            existing.has_invoice_attachment = Boolean(po.supplier_invoice_path);
          }
        } else {
          itemsMap.set(poItem.item_id, {
            item_id: poItem.item_id,
            item_name: itemName,
            total_quantity: quantity,
            total_cost: lineCost,
            primary_unit: primaryUnit,
            secondary_unit: secondaryUnit,
            conversion_rate: conversionRate,
            last_ordered: po.order_date,
            latest_invoice_number: invoiceNumber,
            latest_invoice_id: invoiceId,
            latest_po_id: po.id,
            has_invoice_attachment: Boolean(
              po.supplier_invoice_pdf_path ||
              po.supplier_invoice?.pdf_path ||
              po.supplier_invoice_path
            ),
            invoice_count: hasInvoice ? 1 : 0,
          });
        }
      });

      return itemsMap;
    }, new Map<number, {
      item_id: number;
      item_name: string;
      total_quantity: number;
      total_cost: number;
      primary_unit: string;
      secondary_unit?: string | null;
      conversion_rate?: number | null;
      last_ordered: string;
      latest_invoice_number: string | null;
      latest_invoice_id?: number;
      latest_po_id: number;
      has_invoice_attachment: boolean;
      invoice_count: number;
    }>())
    .values() : [];

  const suppliedItemsArray = Array.from(suppliedItems);
  const sharedInvoiceCountByNumber = suppliedItemsArray.reduce((acc, item) => {
    const invoiceNo = item.latest_invoice_number?.trim();
    if (!invoiceNo) return acc;
    acc.set(invoiceNo, (acc.get(invoiceNo) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const sharedInvoicePalette = [
    "bg-blue-100",
    "bg-emerald-100",
    "bg-violet-100",
    "bg-amber-100",
    "bg-cyan-100",
    "bg-rose-100",
  ];
  const sharedInvoiceColorByNumber = Array.from(sharedInvoiceCountByNumber.entries()).reduce((acc, [invoiceNo], idx) => {
    acc.set(invoiceNo, sharedInvoicePalette[idx % sharedInvoicePalette.length]);
    return acc;
  }, new Map<string, string>());


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
      // Handle missing account mappings with a dedicated dialog + redirect
      if (handleStockAccountMappingError(error, (path) => router.push(path))) {
        setIsPaymentModalOpen(false);
        return;
      }

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
  const handleOpenPaymentModal = async () => {
    if (!supplier) return;

    setCheckingMappings(true);
    try {
      const isConfigured = await checkStockAccountMappingsConfigured();
      if (!isConfigured) {
        const dialogTitle = "Account Mappings Required";
        const dialogBody =
          "Stock Account Mappings are not configured.\n\n" +
          "To make supplier payments and track balances correctly, you need to configure:\n" +
          "- Inventory Account (Asset)\n" +
          "- Accounts Payable Account (Liability)\n\n" +
          "Would you like to open Stock Account Mappings settings now?";

        if (typeof window !== "undefined") {
          const goToSettings = window.confirm(`${dialogTitle}\n\n${dialogBody}`);
          if (goToSettings) {
            router.push("/settings/stock-accounts");
          }
        } else {
          router.push("/settings/stock-accounts");
        }
        return;
      }

      fetchPaymentAccounts();
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error("Failed to check stock account mappings before supplier payment:", error);
      addToast("Failed to verify Stock Account Mappings. Please try again.", "error");
    } finally {
      setCheckingMappings(false);
    }
  };

  // Calculate effective outstanding balance (directly from backend)
  const effectiveOutstandingBalance = outstandingBalance;

  // Transform backend daily totals for chart display
  const paymentTrendData = useMemo(() => {
    // Use backend daily totals if available (authoritative source)
    if (dailyTotals.length > 0) {
      return dailyTotals.map((d) => ({
        label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        purchased: d.purchased,
        paid: d.paid,
        cumPurchased: d.cumulative_purchased,
        cumPaid: d.cumulative_paid,
        outstanding: d.outstanding,
      }));
    }

    // Fallback: derive from PO/payment data (will not match summary cards exactly)
    const events: { date: string; purchased: number; paid: number }[] = [];

    purchaseOrders
      .filter((po) => (po.status === "received" || po.status === "partial") && !!po.order_date)
      .forEach((po) => {
        const receivedCost = (po.items || []).reduce((sum, item) => {
          const price = Number(item.final_unit_price ?? item.unit_price) || 0;
          const qty = Number(item.quantity_received ?? 0);
          return sum + price * qty;
        }, 0);
        if (receivedCost > 0) {
          events.push({ date: (po.received_date ?? po.order_date).slice(0, 10), purchased: receivedCost, paid: 0 });
        }
      });

    payments
      .filter((p) => !!p.payment_date)
      .forEach((p) => {
        events.push({ date: p.payment_date.slice(0, 10), purchased: 0, paid: Number(p.amount) || 0 });
      });

    events.sort((a, b) => a.date.localeCompare(b.date));

    let cumPurchased = 0;
    let cumPaid = 0;

    const byDate = new Map<string, { purchased: number; paid: number; cumPurchased: number; cumPaid: number; outstanding: number }>();

    for (const ev of events) {
      cumPurchased += ev.purchased;
      cumPaid += ev.paid;

      const existing = byDate.get(ev.date);
      if (existing) {
        existing.purchased += ev.purchased;
        existing.paid += ev.paid;
        existing.cumPurchased = cumPurchased;
        existing.cumPaid = cumPaid;
        existing.outstanding = cumPurchased - cumPaid;
      } else {
        byDate.set(ev.date, {
          purchased: ev.purchased,
          paid: ev.paid,
          cumPurchased,
          cumPaid,
          outstanding: cumPurchased - cumPaid,
        });
      }
    }

    return Array.from(byDate.entries()).map(([date, d]) => ({
      label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
      purchased: d.purchased,
      paid: d.paid,
      cumPurchased: d.cumPurchased,
      cumPaid: d.cumPaid,
      outstanding: d.outstanding,
    }));
  }, [dailyTotals, purchaseOrders, payments]);

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
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${po.status === 'received' ? 'bg-green-100 text-green-800' :
                            po.status === 'sent' || po.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              po.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                                po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {getPurchaseOrderItemsDisplay(po)}
                        </td>
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

                {/* Financial Summary Cards (Replica of Customer Profile) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Payable Amount (Outstanding Balance if > 0) */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Payable Amount</p>
                        <p className="text-2xl font-bold text-red-900">
                          PKR {Math.max(0, effectiveOutstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-red-600 mt-1">Outstanding balance</p>
                        {(Number(supplier?.opening_balance) > 0) && (
                          <p className="text-[10px] text-red-500 mt-0.5 font-medium">
                            (Opening: PKR {Number(supplier.opening_balance).toLocaleString()})
                          </p>
                        )}
                      </div>
                      <DollarSign className="w-8 h-8 text-red-400" />
                    </div>
                  </div>

                  {/* Advance Balance (abs(Outstanding Balance) if < 0) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Advance Balance</p>
                        <p className="text-2xl font-bold text-blue-900">
                          PKR {Math.max(0, -effectiveOutstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Prepaid / Credit</p>
                        {(Number(supplier?.opening_advance_balance) > 0) && (
                          <p className="text-[10px] text-blue-500 mt-0.5 font-medium">
                            (Opening: PKR {Number(supplier.opening_advance_balance).toLocaleString()})
                          </p>
                        )}
                      </div>
                      <CreditCard className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>

                  {/* Total Purchased */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Total Purchased</p>
                        <p className="text-2xl font-bold text-green-900">
                          PKR {totalPurchased.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-600 mt-1">All-time received</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Supplier Financial Trend */}
                {paymentTrendData.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Supplier Financial Trend</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Green = total purchased over time &middot; Blue = total paid &middot; Gap between them = what you owe
                      </p>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={paymentTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6B7280", fontSize: 11 }}
                            dy={8}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6B7280", fontSize: 11 }}
                            tickFormatter={(v: number) => {
                              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                              return String(v);
                            }}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const fmt = (n: number) => `PKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                              const d = payload[0]?.payload as typeof paymentTrendData[number] | undefined;
                              return (
                                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs min-w-[220px]">
                                  <p className="font-semibold text-gray-800 mb-2 border-b pb-1.5">{label}</p>
                                  {d?.purchased ? (
                                    <div className="flex justify-between mb-0.5">
                                      <span className="text-green-700">Purchased (day)</span>
                                      <span className="font-medium text-green-800">{fmt(d.purchased)}</span>
                                    </div>
                                  ) : null}
                                  {d?.paid ? (
                                    <div className="flex justify-between mb-0.5">
                                      <span className="text-blue-700">Paid (day)</span>
                                      <span className="font-medium text-blue-800">{fmt(d.paid)}</span>
                                    </div>
                                  ) : null}
                                  <div className="border-t mt-1.5 pt-1.5 space-y-0.5">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Purchased</span>
                                      <span className="font-semibold text-gray-900">{fmt(d?.cumPurchased ?? 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Paid</span>
                                      <span className="font-semibold text-gray-900">{fmt(d?.cumPaid ?? 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 mt-1">
                                      <span className="text-red-700 font-medium">Outstanding</span>
                                      <span className="font-bold text-red-700">{fmt(d?.outstanding ?? 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                            cursor={{ fill: "#F9FAFB" }}
                          />
                          <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }} />

                          <Line
                            type="monotone"
                            dataKey="cumPurchased"
                            name="Total Purchased"
                            stroke="#16a34a"
                            strokeWidth={2.5}
                            fill="url(#purchaseGrad)"
                            dot={{ r: 3.5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cumPaid"
                            name="Total Paid"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            fill="url(#paidGrad)"
                            dot={{ r: 3.5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="outstanding"
                            name="Outstanding"
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            dot={{ r: 3, fill: "#ef4444", stroke: "#fff", strokeWidth: 1.5 }}
                          />

                          <Bar dataKey="purchased" name="Day Purchase" fill="#22c55e" opacity={0.3} radius={[3, 3, 0, 0]} barSize={16} />
                          <Bar dataKey="paid" name="Day Payment" fill="#3b82f6" opacity={0.3} radius={[3, 3, 0, 0]} barSize={16} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

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
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Cost</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Ordered</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {suppliedItemsArray.map((item) => {
                            const invoiceNo = item.latest_invoice_number?.trim();
                            const isSharedInvoice = Boolean(
                              invoiceNo && (sharedInvoiceCountByNumber.get(invoiceNo) ?? 0) > 1
                            );
                            const sharedRowTint = isSharedInvoice
                              ? (sharedInvoiceColorByNumber.get(invoiceNo!) ?? "bg-blue-50/40")
                              : "";

                            return (
                            <tr key={item.item_id} className={`${sharedRowTint} hover:brightness-95`}>
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
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                                PKR {item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.latest_invoice_number || "—"}</span>
                                  {!item.latest_invoice_number && item.invoice_count > 1 && (
                                    <span className="text-xs text-gray-500">Multiple invoices linked</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {item.last_ordered ? formatDate(item.last_ordered) : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {(item.latest_invoice_id || item.has_invoice_attachment) ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handlePreviewInvoice(item.latest_invoice_id, item.latest_po_id)}
                                        className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                        title="Preview invoice"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDownloadInvoice(item.latest_invoice_id, item.latest_po_id)}
                                        className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                        title="Download invoice"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No file</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )})}
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

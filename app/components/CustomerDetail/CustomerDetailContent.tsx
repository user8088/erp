"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import CustomerDetailTabs from "./CustomerDetailTabs";
import CustomerDetailsForm from "./CustomerDetailsForm";
import CustomerRentals from "./CustomerRentals";
import CustomerDeliveryProfit from "./CustomerDeliveryProfit";
import CustomerEarnings from "./CustomerEarnings";
import CustomerStockProfit from "./CustomerStockProfit";
import RecordPaymentModal from "./RecordPaymentModal";
import { customerPaymentSummaryApi, customerPaymentsApi, chequesApi, accountsApi, invoicesApi, salesApi, itemsApi, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Customer, CustomerPaymentSummary, CustomerPayment, Invoice, Sale, SaleItem, Account } from "../../lib/types";
import { DollarSign, TrendingUp, CreditCard, FileText, Calendar, Plus, Eye, Download } from "lucide-react";

interface CustomerDetailContentProps {
  customerId: string;
  customer: Customer | null;
  onCustomerChange: (customer: Customer) => void;
  saveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function CustomerDetailContent({
  customerId,
  customer,
  onCustomerChange,
  saveSignal,
  onSavingChange,
}: CustomerDetailContentProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("customer-details");

  // Payment summary data
  const [paymentSummary, setPaymentSummary] = useState<CustomerPaymentSummary | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Customer payments list
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [invoiceItemSummaries, setInvoiceItemSummaries] = useState<Record<number, string>>({});
  const fetchedSaleIdsRef = useRef<Set<number>>(new Set());
  const itemNamesCache = useRef<Record<number, string>>({});
  const itemBrandsCache = useRef<Record<number, string | null>>({});
  const itemUnitsCache = useRef<Record<number, string>>({});

  // Customer invoices
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Payment recording modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Cheque Actions State
  const [clearingChequeId, setClearingChequeId] = useState<number | null>(null);
  const [bouncingChequeId, setBouncingChequeId] = useState<number | null>(null);
  const [depositAccountId, setDepositAccountId] = useState<number | null>(null);
  const [actionDate, setActionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actionNote, setActionNote] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);


  // Calculate effective payment summary (from API or calculated from invoices)
  const effectiveSummary = useMemo(() => {
    // Get opening due amount from customer or payment summary
    const openingDueAmount =
      paymentSummary?.opening_due_amount ??
      customer?.opening_due_amount ??
      0;

    if (paymentSummary) {
      // Normalize prepaid/advance fields in case backend omits one of them
      const receivedAdvance = Array.isArray(paymentSummary.advance_transactions)
        ? paymentSummary.advance_transactions
          .filter(tx => tx.transaction_type === 'received')
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : 0;
      const usedAdvance = Array.isArray(paymentSummary.advance_transactions)
        ? paymentSummary.advance_transactions
          .filter(tx => tx.transaction_type === 'used')
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : 0;
      const refundedAdvance = Array.isArray(paymentSummary.advance_transactions)
        ? paymentSummary.advance_transactions
          .filter(tx => tx.transaction_type === 'refunded')
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : 0;
      const computedAdvance =
        receivedAdvance - usedAdvance - refundedAdvance;

      const prepaid =
        paymentSummary.prepaid_amount ??
        paymentSummary.advance_balance ??
        computedAdvance ??
        0;

      // IMPORTANT: Backend should already include opening_due_amount in due_amount
      // If backend returns opening_due_amount separately, due_amount already includes it
      // So we should use due_amount as-is, and only add opening_due_amount if backend didn't include it
      // Check if backend provided opening_due_amount - if yes, due_amount already includes it
      const backendHasOpeningDue = paymentSummary.opening_due_amount !== undefined && paymentSummary.opening_due_amount !== null;
      const totalDueAmount = backendHasOpeningDue
        ? (paymentSummary.due_amount || 0)  // Backend already included it
        : (paymentSummary.due_amount || 0) + openingDueAmount;  // Backend didn't include it, add it

      return {
        ...paymentSummary,
        due_amount: totalDueAmount,
        opening_due_amount: paymentSummary.opening_due_amount ?? openingDueAmount,
        prepaid_amount: prepaid,
        advance_balance: paymentSummary.advance_balance ?? prepaid,
        advance_transactions: paymentSummary.advance_transactions || [],
      };
    }

    // Calculate from invoices if API data is not available
    const totalSpent = customerInvoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    const invoiceDueAmount = customerInvoices
      .filter(inv => inv.status === 'issued')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    // Add opening due amount to invoice due amount
    const totalDueAmount = invoiceDueAmount + openingDueAmount;

    const paidAmount = customerInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    return {
      customer_id: Number(customerId),
      due_amount: totalDueAmount,
      opening_due_amount: openingDueAmount,
      prepaid_amount: 0, // We don't have advance payment data without API
      total_spent: totalSpent,
      total_paid: paidAmount,
      outstanding_invoices: customerInvoices
        .filter(inv => inv.status === 'issued')
        .map(inv => ({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.total_amount,
          due_amount: inv.total_amount,
          invoice_date: inv.invoice_date,
        })),
      advance_balance: 0,
      advance_transactions: [],
    };
  }, [paymentSummary, customerInvoices, customerId, customer]);

  // Decide if we should show the summary/payment section (even if values are zero)
  const hasAnyPaymentData =
    effectiveSummary.total_spent > 0 ||
    effectiveSummary.due_amount > 0 ||
    (effectiveSummary.opening_due_amount ?? 0) > 0 ||
    effectiveSummary.prepaid_amount > 0 ||
    (effectiveSummary.advance_transactions?.length ?? 0) > 0 ||
    customerPayments.length > 0;

  // Helpers to normalize API responses that may have multiple shapes
  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === "object" ? (value as Record<string, unknown>) : null;

  const isPaymentSummary = (value: unknown): value is CustomerPaymentSummary => {
    if (!value || typeof value !== "object") return false;
    const rec = value as Record<string, unknown>;
    return "customer_id" in rec && "due_amount" in rec && "total_spent" in rec;
  };

  const extractPaymentSummary = useCallback((resp: unknown): CustomerPaymentSummary | null => {
    if (isPaymentSummary(resp)) return resp;

    const root = asRecord(resp);
    if (!root) return null;

    const dataField = asRecord(root.data);

    const candidates: unknown[] = [
      root.payment_summary,
      root.paymentSummary,
      dataField?.payment_summary,
      dataField?.paymentSummary,
      root.data,
    ];

    for (const candidate of candidates) {
      if (isPaymentSummary(candidate)) return candidate;
    }

    return null;
  }, []);

  const extractPayments = useCallback((resp: unknown): CustomerPayment[] => {
    if (Array.isArray(resp)) return resp;

    const root = asRecord(resp);
    if (!root) return [];

    const dataField = root.data;
    const paymentsField = root.payments;

    const candidates: unknown[] = [
      dataField,
      paymentsField,
      asRecord(dataField)?.payments,
      asRecord(paymentsField)?.data,
      asRecord(dataField)?.data,
      asRecord(asRecord(dataField)?.data)?.data,
      asRecord(asRecord(dataField)?.payments)?.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate as CustomerPayment[];
    }

    return [];
  }, []);

  const handleDownloadInvoice = useCallback(
    async (invoiceId: number) => {
      try {
        const blob = await invoicesApi.downloadInvoice(invoiceId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast("Invoice downloaded successfully", "success");
      } catch (error) {
        console.error("Failed to download invoice:", error);
        addToast("Failed to download invoice", "error");
      }
    },
    [addToast]
  );

  const handleViewInvoice = useCallback(
    async (invoiceId: number) => {
      try {
        const blob = await invoicesApi.downloadInvoice(invoiceId);
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch (error) {
        console.error("Failed to open invoice preview:", error);
        addToast("Failed to open invoice", "error");
      }
    },
    [addToast]
  );

  const formatSaleItems = (saleItems: SaleItem[] | undefined | null): string => {
    if (!saleItems || saleItems.length === 0) return "";
    return saleItems
      .map((item) => {
        // Try to get item name from various sources
        const name = item?.item?.name
          ?? itemNamesCache.current[item?.item_id ?? 0]
          ?? `Item #${item?.item_id ?? ""}`.trim();
        // Try to get brand from item object or cache
        const brand = item?.item?.brand
          ?? itemBrandsCache.current[item?.item_id ?? 0]
          ?? null;
        // Get unit - prioritize item.unit, then item.item.primary_unit, then cache
        const unit = item?.unit
          || item?.item?.primary_unit
          || itemUnitsCache.current[item?.item_id ?? 0]
          || "";
        const qty = item?.quantity ?? 0;
        // Format quantity without unnecessary decimals (1 instead of 1.0000)
        const formattedQty = qty % 1 === 0 ? Math.floor(qty).toString() : qty.toString();
        // Format as "quantity unit brand name" (e.g., "8 bags paidaar cement")
        // Always include unit if available
        const parts = [formattedQty];
        if (unit) {
          parts.push(unit);
        }
        if (brand) {
          parts.push(brand);
        }
        parts.push(name);
        return parts.join(" ").trim();
      })
      .filter(Boolean)
      .join(", ");
  };

  const fetchSaleItemsForInvoices = useCallback(async (invoices: Invoice[]) => {
    const saleInvoices = invoices.filter(
      (invoice) => invoice.reference_type === "sale" || invoice.reference_id
    );

    const tasks = saleInvoices.map(async (invoice) => {
      // Try to derive saleId and items from metadata first
      const metadata = invoice.metadata as Record<string, unknown> | undefined;
      const metaSale: Sale | undefined = (metadata?.sale as Sale) ?? undefined;
      const metaItems: SaleItem[] | undefined =
        (metaSale?.items as SaleItem[] | undefined) ||
        (metadata?.items as SaleItem[] | undefined);
      const metaSaleId: number | undefined =
        (metadata?.sale_id as number | undefined) ??
        (metaSale?.id as number | undefined) ??
        (invoice.reference_id as number | undefined);

      // If items are already present in metadata, use them without fetching
      if (metaItems && metaItems.length > 0) {
        // Check if any items are missing names or brands
        const itemIds = metaItems
          .filter(item => item?.item_id && (!item?.item?.name || item?.item?.brand === undefined))
          .map(item => item.item_id!);

        if (itemIds.length > 0) {
          // Fetch missing item names and brands
          const fetchPromises = itemIds
            .filter(id => id && (!itemNamesCache.current[id] || itemBrandsCache.current[id] === undefined))
            .map(async (itemId) => {
              try {
                const response = await itemsApi.getItem(itemId);
                if (response.item) {
                  if (response.item.name) {
                    itemNamesCache.current[itemId] = response.item.name;
                  }
                  if (response.item.brand !== undefined) {
                    itemBrandsCache.current[itemId] = response.item.brand;
                  }
                  if (response.item.primary_unit) {
                    itemUnitsCache.current[itemId] = response.item.primary_unit;
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch item ${itemId}:`, error);
              }
            });

          await Promise.all(fetchPromises);
        }

        const summary = formatSaleItems(metaItems);
        if (summary) {
          setInvoiceItemSummaries((prev) => ({
            ...prev,
            [invoice.id]: summary,
          }));
        }
        // Even if we had items, skip refetch if we already have saleId cached
        if (metaSaleId) {
          fetchedSaleIdsRef.current.add(metaSaleId);
        }
        return;
      }

      // Otherwise fetch sale by id if available
      if (!metaSaleId || fetchedSaleIdsRef.current.has(metaSaleId)) return;

      fetchedSaleIdsRef.current.add(metaSaleId);
      try {
        const saleResponse = await salesApi.getSale(metaSaleId);
        const sale =
          (saleResponse as { sale?: Sale }).sale ??
          (saleResponse as unknown as Sale | undefined);
        const summary = formatSaleItems(sale?.items);
        if (summary) {
          setInvoiceItemSummaries((prev) => ({
            ...prev,
            [invoice.id]: summary,
          }));
        }
      } catch (error) {
        console.warn("Failed to fetch sale items for invoice", invoice.id, error);
      }
    });

    await Promise.all(tasks);
  }, []);

  // Fetch payment summary
  const fetchPaymentSummary = useCallback(async () => {
    if (!customerId || activeTab !== "customer-payments") return;

    setLoadingPayments(true);
    try {
      const response = await customerPaymentSummaryApi.getCustomerPaymentSummary(Number(customerId));
      const summary = extractPaymentSummary(response);
      console.log("[CustomerPayments] payment summary raw:", response, "parsed:", summary);
      setPaymentSummary(summary || null);
    } catch (error) {
      console.error("Failed to fetch payment summary:", error);
      if (!(error instanceof ApiError && error.status === 404)) {
        addToast("Failed to load payment summary", "error");
      }
      setPaymentSummary(null);
    } finally {
      setLoadingPayments(false);
    }
  }, [customerId, activeTab, addToast, extractPaymentSummary]);

  // Fetch customer payments list
  const fetchCustomerPayments = useCallback(async () => {
    if (!customerId || activeTab !== "customer-payments") return;

    try {
      const response = await customerPaymentsApi.getCustomerPayments({
        customer_id: Number(customerId),
        per_page: 50,
      });
      const payments = extractPayments(response) || [];
      console.log("[CustomerPayments] payments raw:", response, "parsed:", payments);
      // Sort payments so latest appears on top.
      // Prefer created_at (includes time); fall back to payment_date, then id.
      const sortedPayments = [...payments].sort((a, b) => {
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;

        if (aCreated !== bCreated) {
          return bCreated - aCreated;
        }

        const aDate = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const bDate = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        if (aDate !== bDate) {
          return bDate - aDate;
        }

        return (b.id || 0) - (a.id || 0);
      });
      setCustomerPayments(sortedPayments);
    } catch (error) {
      console.error("Failed to fetch customer payments:", error);
      setCustomerPayments([]);
    }
  }, [customerId, activeTab, extractPayments]);

  // Fetch customer invoices
  const fetchCustomerInvoices = useCallback(async () => {
    if (!customerId) return;

    // Only fetch if we're on a tab that needs invoices
    if (activeTab !== "transactions" && activeTab !== "customer-payments") return;

    setLoadingInvoices(true);
    try {
      const response = await invoicesApi.getInvoices({
        invoice_type: 'sale',
        per_page: 50,
      });

      // Filter invoices for this customer
      const customerIdNum = Number(customerId);
      const filtered = response.invoices.filter(invoice => {
        const metadata = invoice.metadata;
        return metadata?.customer?.id === customerIdNum;
      });
      setCustomerInvoices(filtered);
      fetchSaleItemsForInvoices(filtered);
    } catch (error) {
      console.error("Failed to fetch customer invoices:", error);
      setCustomerInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [customerId, activeTab, fetchSaleItemsForInvoices]);

  useEffect(() => {
    if (activeTab === "customer-payments") {
      fetchPaymentSummary();
      fetchCustomerPayments();
      fetchCustomerInvoices(); // Also fetch invoices for payment modal
    } else if (activeTab === "transactions") {
      fetchCustomerInvoices();
      fetchCustomerPayments(); // Also fetch payments for transactions tab
    }
  }, [activeTab, fetchPaymentSummary, fetchCustomerPayments, fetchCustomerInvoices]);

  // Fetch accounts for cheque clearing
  const fetchAccounts = async () => {
    if (accounts.length > 0) return;
    setLoadingAccounts(true);
    try {
      // Assuming company_id 1 for now or from context if available
      const response = await accountsApi.getAccounts({ company_id: 1, root_type: "asset", is_group: false });
      setAccounts(response.data);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      addToast("Failed to load accounts", "error");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleClearCheque = (paymentId: number) => {
    setClearingChequeId(paymentId);
    setDepositAccountId(null);
    setActionDate(new Date().toISOString().split('T')[0]);
    fetchAccounts();
  };

  const handleBounceCheque = (paymentId: number) => {
    setBouncingChequeId(paymentId);
    setActionNote("");
    setActionDate(new Date().toISOString().split('T')[0]);
  };

  const confirmClearCheque = async () => {
    if (!clearingChequeId) return;
    if (!depositAccountId) {
      addToast("Please select a deposit account", "error");
      return;
    }

    try {
      await chequesApi.clearCheque(clearingChequeId, {
        deposit_account_id: depositAccountId,
        cleared_date: actionDate,
      });
      addToast("Cheque cleared successfully", "success");
      setClearingChequeId(null);
      fetchCustomerPayments(); // Refresh payments
      fetchPaymentSummary(); // Refresh summary (balance updates)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to clear cheque";
      addToast(message, "error");
    }
  };

  const confirmBounceCheque = async () => {
    if (!bouncingChequeId) return;
    if (!actionNote) {
      addToast("Please provide a reason/note", "error");
      return;
    }

    try {
      await chequesApi.bounceCheque(bouncingChequeId, {
        notes: actionNote,
        bounced_date: actionDate,
      });
      addToast("Cheque marked as bounced", "success");
      setBouncingChequeId(null);
      fetchCustomerPayments(); // Refresh payments
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to bounce cheque";
      addToast(message, "error");
    }
  };

  // Fetch invoices when payment modal opens
  useEffect(() => {
    if (showPaymentModal && customerInvoices.length === 0) {
      fetchCustomerInvoices();
    }
  }, [showPaymentModal, customerInvoices.length, fetchCustomerInvoices]);

  // Handle payment recorded - refresh all payment data
  const handlePaymentRecorded = useCallback(() => {
    fetchPaymentSummary();
    fetchCustomerPayments();
    fetchCustomerInvoices();
  }, [fetchPaymentSummary, fetchCustomerPayments, fetchCustomerInvoices]);

  return (
    <div className="flex-1">
      <CustomerDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "customer-details" && (
          <CustomerDetailsForm
            customerId={customerId}
            customer={customer}
            onCustomerUpdated={onCustomerChange}
            externalSaveSignal={saveSignal}
            onSavingChange={onSavingChange}
          />
        )}
        {activeTab === "customer-payments" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900">Customer Payments</h2>
              {customer && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Record Payment
                </button>
              )}
            </div>
            {loadingPayments || loadingInvoices ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading payment information...</p>
              </div>
            ) : hasAnyPaymentData ? (
              <div className="space-y-6">
                {/* Payment Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Due Amount */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Due Amount</p>
                        <p className="text-2xl font-bold text-red-900">
                          PKR {effectiveSummary.due_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {effectiveSummary.opening_due_amount && effectiveSummary.opening_due_amount > 0
                            ? `Opening balance + Unpaid invoices`
                            : `Unpaid invoices`}
                        </p>
                        {effectiveSummary.opening_due_amount && effectiveSummary.opening_due_amount > 0 && (
                          <p className="text-xs text-red-500 mt-0.5">
                            (Opening: PKR {effectiveSummary.opening_due_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                          </p>
                        )}
                      </div>
                      <DollarSign className="w-8 h-8 text-red-400" />
                    </div>
                  </div>

                  {/* Pre-paid Amount */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Pre-paid Amount</p>
                        <p className="text-2xl font-bold text-blue-900">
                          PKR {effectiveSummary.prepaid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Advance payments</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>

                  {/* Total Spent */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Total Spent</p>
                        <p className="text-2xl font-bold text-green-900">
                          PKR {effectiveSummary.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-600 mt-1">All-time sales</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>


                {/* Outstanding Invoices */}
                {effectiveSummary.outstanding_invoices && effectiveSummary.outstanding_invoices.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Outstanding Invoices</h3>
                    <div className="space-y-2">
                      {effectiveSummary.outstanding_invoices.map((invoice) => (
                        <div key={invoice.invoice_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </p>
                            {invoiceItemSummaries[invoice.invoice_id] && (
                              <p className="text-xs text-gray-500 line-clamp-2">
                                Items: {invoiceItemSummaries[invoice.invoice_id]}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              PKR {invoice.due_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500">Due</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advance Transactions */}
                {effectiveSummary.advance_transactions && effectiveSummary.advance_transactions.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Advance Transactions</h3>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await customerPaymentSummaryApi.downloadAdvanceTransactions(Number(customerId));
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `advance-transactions-${customer?.serial_number || customerId}-${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            addToast("Advance transactions downloaded successfully", "success");
                          } catch (error) {
                            console.error("Failed to download advance transactions:", error);
                            addToast("Failed to download advance transactions", "error");
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Download advance transactions record"
                      >
                        <Download className="w-4 h-4" />
                        Download Record
                      </button>
                    </div>
                    <div className="space-y-2">
                      {effectiveSummary.advance_transactions.slice(0, 10).map((transaction) => {
                        // Get invoice information if available
                        const invoice = transaction.payment?.invoice;
                        const invoiceNumber = invoice?.invoice_number || transaction.payment?.invoice?.invoice_number;

                        // Get sale information if available
                        const sale = transaction.sale || (invoice?.metadata?.sale as Sale | undefined);
                        const saleItems = sale?.items || [];
                        const saleDescription = saleItems.length > 0
                          ? saleItems.map((item: SaleItem) => {
                            const itemName = item.item?.name || 'item';
                            const quantity = item.quantity || 1;
                            const unit = item.unit || '';
                            return `${quantity} ${unit} ${itemName}`.trim();
                          }).join(', ')
                          : null;

                        // Get description from notes or reference
                        const description = transaction.notes || transaction.reference ||
                          (transaction.transaction_type === 'used' && invoiceNumber
                            ? `Used to pay Invoice #${invoiceNumber}${saleDescription ? ` - ${saleDescription}` : ''}`
                            : null) ||
                          (transaction.transaction_type === 'received'
                            ? 'Advance payment received'
                            : transaction.transaction_type === 'refunded'
                              ? 'Advance refunded'
                              : null);

                        return (
                          <div key={transaction.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.transaction_type === 'received' ? 'Received' :
                                    transaction.transaction_type === 'used' ? 'Used' : 'Refunded'}
                                </p>
                                {invoiceNumber && transaction.transaction_type === 'used' && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded">
                                    Invoice #{invoiceNumber}
                                  </span>
                                )}
                              </div>
                              {description && (
                                <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                  {description}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <p className={`text-sm font-semibold ${transaction.transaction_type === 'received' ? 'text-green-600' :
                                transaction.transaction_type === 'used' ? 'text-red-600' : 'text-blue-600'
                                }`}>
                                {transaction.transaction_type === 'received' ? '+' : '-'}
                                PKR {Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-gray-500">
                                Balance: PKR {transaction.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoices</h3>
                  {loadingInvoices ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">Loading invoices...</p>
                    </div>
                  ) : customerInvoices.length > 0 ? (
                    <div className="space-y-2">
                      {customerInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${invoice.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : invoice.status === 'issued'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : invoice.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                {invoice.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString()}
                              </p>
                              {invoiceItemSummaries[invoice.id] && (
                                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 leading-snug line-clamp-2">
                                  <span className="font-medium text-gray-700">Items:</span> {invoiceItemSummaries[invoice.id]}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              PKR {(() => {
                                // If total_amount is 0 (refunded), try to show original amount from metadata
                                if (invoice.total_amount === 0 && ((invoice.status as string) === 'refunded' || invoice.status === 'cancelled')) {
                                  const metadata = invoice.metadata as (Record<string, unknown> & { sale?: Sale; items?: SaleItem[] }) | null;
                                  const metaSale = metadata?.sale as Sale | undefined;
                                  const metaItems = (metadata?.items as SaleItem[] | undefined) || (metaSale?.items as SaleItem[] | undefined);

                                  if (metaSale?.total_amount && metaSale.total_amount > 0) return metaSale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 });
                                  if (metaSale?.subtotal && metaSale.subtotal > 0) return metaSale.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 });
                                  
                                  // Calculate from items if sale totals are also 0
                                  if (metaItems && Array.isArray(metaItems) && metaItems.length > 0) {
                                    const total = metaItems.reduce((sum: number, item: SaleItem) => sum + (Number(item.total) || Number(item.subtotal) || 0), 0);
                                    if (total > 0) return total.toLocaleString(undefined, { minimumFractionDigits: 2 });
                                  }
                                }
                                return invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 });
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(invoice.metadata?.sale_type === 'walk-in' || invoice.invoice_type === 'sale')
                                ? (invoice.metadata?.sale_type === 'walk-in' ? 'Walk-in' : 'Delivery')
                                : invoice.invoice_type}
                            </p>
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleViewInvoice(invoice.id)}
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Preview invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(invoice.id)}
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Download invoice"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No invoices found</p>
                      <p className="text-xs mt-1 text-gray-400">
                        Invoices will appear here once sales are processed.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cheques */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Cheques</h3>
                  {customerPayments.filter(p => p.payment_method === 'cheque').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Cheque Number</th>
                            <th className="px-4 py-3 font-medium text-gray-500">Bank Name</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Amount</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Status</th>
                            <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                          {customerPayments
                            .filter(p => p.payment_method === 'cheque')
                            .map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-gray-900">
                                  {(payment.cheque?.cheque_date || payment.cheque_date)
                                    ? new Date(payment.cheque?.cheque_date || payment.cheque_date!).toLocaleDateString()
                                    : '-'}
                                </td>
                                <td className="px-4 py-3 text-gray-900 font-medium">
                                  {payment.cheque?.cheque_number || payment.cheque_number || '-'}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {payment.cheque?.bank_name || payment.bank_name || '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-900">
                                  PKR {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {(() => {
                                    const rawStatus = payment.cheque?.status || payment.cheque_status || 'pending';
                                    const status = rawStatus.toLowerCase();
                                    return (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'cleared'
                                          ? 'bg-green-100 text-green-800'
                                          : status === 'bounced'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {status === 'pending_clearance' ? 'Pending Clearance' : (status.charAt(0).toUpperCase() + status.slice(1))}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                  {(() => {
                                    const rawStatus = payment.cheque?.status || payment.cheque_status || 'pending';
                                    const status = rawStatus.toLowerCase();
                                    if (status === 'pending' || status === 'pending_clearance') {
                                      return (
                                        <>
                                          <button
                                            onClick={() => handleClearCheque(payment.id)}
                                            className="text-xs font-medium text-green-600 hover:text-green-800 underline"
                                          >
                                            Clear
                                          </button>
                                          <button
                                            onClick={() => handleBounceCheque(payment.id)}
                                            className="text-xs font-medium text-red-600 hover:text-red-800 underline"
                                          >
                                            Bounce
                                          </button>
                                        </>
                                      );
                                    }
                                    return null;
                                  })()}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No cheques received from this customer.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No payment data available</p>
                <p className="text-xs text-gray-400">
                  Payment information will appear here once transactions are recorded.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === "transactions" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6">Related Transactions</h2>

            {loadingInvoices ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading transactions...</p>
              </div>
            ) : customerInvoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No transactions found</p>
                <p className="text-xs text-gray-400">
                  Invoices will appear here once transactions are recorded.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {customerInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'issued'
                            ? 'bg-yellow-100 text-yellow-700'
                            : invoice.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString()}
                        </p>
                        {invoiceItemSummaries[invoice.id] && (
                          <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 leading-snug line-clamp-2">
                            <span className="font-medium text-gray-700">Items:</span> {invoiceItemSummaries[invoice.id]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        PKR {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(invoice.metadata?.sale_type === 'walk-in' || invoice.invoice_type === 'sale')
                          ? (invoice.metadata?.sale_type === 'walk-in' ? 'Walk-in' : 'Delivery')
                          : invoice.invoice_type}
                      </p>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Preview invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Download invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "earnings" && (
          <CustomerEarnings customerId={Number(customerId)} />
        )}
        {activeTab === "rentals" && (
          <CustomerRentals customerId={Number(customerId)} />
        )}
        {activeTab === "delivery-profit" && (
          <CustomerDeliveryProfit customerId={Number(customerId)} />
        )}
        {activeTab === "stock-profit" && (
          <CustomerStockProfit customerId={Number(customerId)} />
        )}
        {activeTab === "more-information" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">More Information</h2>
            <p className="text-sm text-gray-500">Additional customer information will appear here.</p>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Customer Settings</h2>
            <p className="text-sm text-gray-500">Customer-specific settings will appear here.</p>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {customer && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          customer={customer}
          outstandingInvoices={customerInvoices.map(inv => ({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            amount: inv.total_amount,
            due_amount: inv.status === 'issued' ? inv.total_amount : 0,
            invoice_date: inv.invoice_date,
            status: inv.status,
          }))}
          customerAdvanceBalance={effectiveSummary.advance_balance || 0}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
      {/* Clear Cheque Modal */}
      {clearingChequeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Clear Cheque</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Account
                </label>
                <select
                  value={depositAccountId || ""}
                  onChange={(e) => setDepositAccountId(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={loadingAccounts}
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cleared Date
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setClearingChequeId(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearCheque}
                  className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  Confirm Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bounce Cheque Modal */}
      {bouncingChequeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Bounce Cheque</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason / Notes
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="e.g. Insufficient funds"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bounced Date
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setBouncingChequeId(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBounceCheque}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Confirm Bounce
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

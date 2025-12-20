"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import CustomerDetailTabs from "./CustomerDetailTabs";
import CustomerDetailsForm from "./CustomerDetailsForm";
import CustomerRentals from "./CustomerRentals";
import RecordPaymentModal from "./RecordPaymentModal";
import { customerPaymentSummaryApi, customerPaymentsApi, invoicesApi, salesApi, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Customer, CustomerPaymentSummary, CustomerPayment, Invoice, Sale, SaleItem } from "../../lib/types";
import { DollarSign, TrendingUp, CreditCard, FileText, Calendar, Plus } from "lucide-react";

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
  const [loadingPaymentList, setLoadingPaymentList] = useState(false);
  const [invoiceItemSummaries, setInvoiceItemSummaries] = useState<Record<number, string>>({});
  const fetchedSaleIdsRef = useRef<Set<number>>(new Set());
  
  // Customer invoices
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Payment recording modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Calculate effective payment summary (from API or calculated from invoices)
  const effectiveSummary = useMemo(() => {
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

      return {
        ...paymentSummary,
        prepaid_amount: prepaid,
        advance_balance: paymentSummary.advance_balance ?? prepaid,
        advance_transactions: paymentSummary.advance_transactions || [],
      };
    }
    
    // Calculate from invoices if API data is not available
    const totalSpent = customerInvoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    
    const dueAmount = customerInvoices
      .filter(inv => inv.status === 'issued')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    
    const paidAmount = customerInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    
    return {
      customer_id: Number(customerId),
      due_amount: dueAmount,
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
  }, [paymentSummary, customerInvoices, customerId]);

  // Decide if we should show the summary/payment section (even if values are zero)
  const hasAnyPaymentData =
    effectiveSummary.total_spent > 0 ||
    effectiveSummary.due_amount > 0 ||
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

  const formatSaleItems = (saleItems: SaleItem[] | undefined | null): string => {
    if (!saleItems || saleItems.length === 0) return "";
    return saleItems
      .map((item) => {
        const name = item?.item?.name ?? `Item #${item?.item_id ?? ""}`.trim();
        const unit = item?.unit ? ` ${item.unit}` : "";
        const qty = item?.quantity ?? 0;
        return `${qty}${unit} ${name}`.trim();
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
    
    setLoadingPaymentList(true);
    try {
      const response = await customerPaymentsApi.getCustomerPayments({
        customer_id: Number(customerId),
        per_page: 50,
      });
      const payments = extractPayments(response);
      console.log("[CustomerPayments] payments raw:", response, "parsed:", payments);
      setCustomerPayments(payments || []);
    } catch (error) {
      console.error("Failed to fetch customer payments:", error);
      setCustomerPayments([]);
    } finally {
      setLoadingPaymentList(false);
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
                        <p className="text-xs text-red-600 mt-1">Unpaid invoices</p>
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
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Advance Transactions</h3>
                    <div className="space-y-2">
                      {effectiveSummary.advance_transactions.slice(0, 10).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.transaction_type === 'received' ? 'Received' : 
                               transaction.transaction_type === 'used' ? 'Used' : 'Refunded'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${
                              transaction.transaction_type === 'received' ? 'text-green-600' :
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment History</h3>
                  {loadingPaymentList ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">Loading payment history...</p>
                    </div>
                  ) : customerPayments.length > 0 ? (
                    <div className="space-y-2">
                      {customerPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{payment.payment_number}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                payment.payment_type === 'invoice_payment' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : payment.payment_type === 'advance_payment'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {payment.payment_type === 'invoice_payment' ? 'Invoice Payment' :
                                 payment.payment_type === 'advance_payment' ? 'Advance' : 'Refund'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {payment.payment_method.replace('_', ' ')}
                              </p>
                              {payment.invoice && (
                              <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                <p>
                                  Invoice: {payment.invoice.invoice_number}
                                </p>
                                {invoiceItemSummaries[payment.invoice.id] && (
                                  <p className="line-clamp-2">
                                    Items: {invoiceItemSummaries[payment.invoice.id]}
                                  </p>
                                )}
                              </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              PKR {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <p className={`text-xs ${
                              payment.status === 'completed' ? 'text-green-600' :
                              payment.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {payment.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No payment history found</p>
                      <p className="text-xs mt-1 text-gray-400">
                        Payment transactions will appear here once payments are recorded.
                      </p>
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
            
            {loadingInvoices || loadingPaymentList ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading transactions...</p>
              </div>
            ) : customerInvoices.length === 0 && customerPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No transactions found</p>
                <p className="text-xs text-gray-400">
                  Invoices and payments will appear here once transactions are recorded.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Invoices Section */}
                {customerInvoices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Invoices</h3>
                    <div className="space-y-2">
                      {customerInvoices.map((invoice) => {
                        const metadata = invoice.metadata;
                        return (
                          <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <p className="text-sm font-medium text-gray-900">{invoice.invoice_number || `Invoice #${invoice.id}`}</p>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                  invoice.status === 'issued' ? 'bg-yellow-100 text-yellow-700' :
                                  invoice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {invoice.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(invoice.invoice_date).toLocaleDateString()}
                                </p>
                                {metadata?.sale_type && (
                                  <p className="text-xs text-gray-500 capitalize">
                                    {metadata.sale_type.replace('-', ' ')}
                                  </p>
                                )}
                              {invoiceItemSummaries[invoice.id] && (
                                <div className="mt-1 text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 leading-snug line-clamp-2">
                                  <span className="font-medium text-gray-700">Items:</span> {invoiceItemSummaries[invoice.id]}
                                </div>
                              )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                PKR {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              {invoice.status !== 'paid' && (
                                <p className="text-xs text-red-600">
                                  Due: PKR {invoice.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payments Section */}
                {customerPayments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payments</h3>
                    <div className="space-y-2">
                      {customerPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{payment.payment_number}</p>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                payment.payment_type === 'invoice_payment' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : payment.payment_type === 'advance_payment'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {payment.payment_type === 'invoice_payment' ? 'Invoice Payment' :
                                 payment.payment_type === 'advance_payment' ? 'Advance' : 'Refund'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {payment.payment_method.replace('_', ' ')}
                              </p>
                              {payment.invoice && (
                                <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                  <p>Invoice: {payment.invoice.invoice_number}</p>
                                  {invoiceItemSummaries[payment.invoice.id] && (
                                    <div className="mt-0.5 text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 leading-snug line-clamp-2">
                                      <span className="font-medium text-gray-700">Items:</span> {invoiceItemSummaries[payment.invoice.id]}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              PKR {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            <p className={`text-xs ${
                              payment.status === 'completed' ? 'text-green-600' :
                              payment.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {payment.status}
              </p>
            </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "rentals" && (
          <CustomerRentals customerId={Number(customerId)} />
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
          outstandingInvoices={effectiveSummary.outstanding_invoices}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}

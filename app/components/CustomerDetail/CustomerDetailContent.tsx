"use client";

import { useState, useEffect, useCallback } from "react";
import CustomerDetailTabs from "./CustomerDetailTabs";
import CustomerDetailsForm from "./CustomerDetailsForm";
import { customerPaymentSummaryApi, customerPaymentsApi, invoicesApi, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Customer, CustomerPaymentSummary, CustomerPayment, Invoice } from "../../lib/types";
import { DollarSign, TrendingUp, CreditCard, FileText, Calendar } from "lucide-react";

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
  const [paymentApiUnavailable, setPaymentApiUnavailable] = useState(false);
  
  // Customer payments list
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [loadingPaymentList, setLoadingPaymentList] = useState(false);
  
  // Customer invoices
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Fetch payment summary
  const fetchPaymentSummary = useCallback(async () => {
    if (!customerId || activeTab !== "customer-payments") return;
    
    setLoadingPayments(true);
    setPaymentApiUnavailable(false);
    try {
      const response = await customerPaymentSummaryApi.getCustomerPaymentSummary(Number(customerId));
      setPaymentSummary(response.payment_summary);
    } catch (error) {
      console.error("Failed to fetch payment summary:", error);
      if (error instanceof ApiError && error.status === 404) {
        setPaymentApiUnavailable(true);
      } else {
        addToast("Failed to load payment summary", "error");
      }
      setPaymentSummary(null);
    } finally {
      setLoadingPayments(false);
    }
  }, [customerId, activeTab, addToast]);

  // Fetch customer payments list
  const fetchCustomerPayments = useCallback(async () => {
    if (!customerId || activeTab !== "customer-payments") return;
    
    setLoadingPaymentList(true);
    try {
      const response = await customerPaymentsApi.getCustomerPayments({
        customer_id: Number(customerId),
        per_page: 50,
      });
      setCustomerPayments(response.data);
    } catch (error) {
      console.error("Failed to fetch customer payments:", error);
      setCustomerPayments([]);
    } finally {
      setLoadingPaymentList(false);
    }
  }, [customerId, activeTab]);

  // Fetch customer invoices
  const fetchCustomerInvoices = useCallback(async () => {
    if (!customerId || activeTab !== "transactions") return;
    
    setLoadingInvoices(true);
    try {
      const response = await invoicesApi.getInvoices({
        invoice_type: 'sale',
        per_page: 50,
      });
      
      // Filter invoices for this customer
      const customerIdNum = Number(customerId);
      const filtered = response.invoices.filter(invoice => {
        const metadata = invoice.metadata as any;
        return metadata?.customer?.id === customerIdNum;
      });
      setCustomerInvoices(filtered);
    } catch (error) {
      console.error("Failed to fetch customer invoices:", error);
      setCustomerInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [customerId, activeTab]);

  useEffect(() => {
    if (activeTab === "customer-payments") {
      fetchPaymentSummary();
      fetchCustomerPayments();
    } else if (activeTab === "transactions") {
      fetchCustomerInvoices();
      fetchCustomerPayments(); // Also fetch payments for transactions tab
    }
  }, [activeTab, fetchPaymentSummary, fetchCustomerPayments, fetchCustomerInvoices]);

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
            <h2 className="text-base font-semibold text-gray-900 mb-6">Customer Payments</h2>
            {loadingPayments ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading payment information...</p>
              </div>
            ) : paymentApiUnavailable ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">Payment Summary API Not Available</p>
                <p className="text-xs text-gray-500">
                  The backend endpoint for customer payment summary has not been implemented yet.
                </p>
              </div>
            ) : paymentSummary ? (
              <div className="space-y-6">
                {/* Payment Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Due Amount */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Due Amount</p>
                        <p className="text-2xl font-bold text-red-900">
                          PKR {paymentSummary.due_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                          PKR {paymentSummary.prepaid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                          PKR {paymentSummary.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-600 mt-1">All-time sales</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Outstanding Invoices */}
                {paymentSummary.outstanding_invoices && paymentSummary.outstanding_invoices.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Outstanding Invoices</h3>
                    <div className="space-y-2">
                      {paymentSummary.outstanding_invoices.map((invoice) => (
                        <div key={invoice.invoice_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </p>
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
                {paymentSummary.advance_transactions && paymentSummary.advance_transactions.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Advance Transactions</h3>
                    <div className="space-y-2">
                      {paymentSummary.advance_transactions.slice(0, 10).map((transaction) => (
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
                                <p className="text-xs text-gray-500">
                                  Invoice: {payment.invoice.invoice_number}
                                </p>
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
                        const metadata = invoice.metadata as any;
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
                                <p className="text-xs text-gray-500">
                                  Invoice: {payment.invoice.invoice_number}
                                </p>
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
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import CustomerDetailTabs from "./CustomerDetailTabs";
import CustomerDetailsForm from "./CustomerDetailsForm";
import { invoicesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Customer } from "../../lib/types";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

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
  
  // Payment summary data (will come from backend)
  const [paymentSummary, setPaymentSummary] = useState({
    dueAmount: 0,
    prePaidAmount: 0,
    totalSpent: 0,
  });
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Fetch payment summary
  const fetchPaymentSummary = useCallback(async () => {
    if (!customerId || activeTab !== "customer-payments") return;
    
    setLoadingPayments(true);
    try {
      // TODO: Replace with actual API call when backend is implemented
      // For now, calculate from invoices
      const response = await invoicesApi.getInvoices({
        invoice_type: 'sale',
        per_page: 1000,
      });

      const customerIdNum = Number(customerId);
      const customerInvoices = response.invoices.filter(invoice => {
        return (invoice.metadata as any)?.customer?.id === customerIdNum;
      });

      // Calculate payment summary
      let totalSpent = 0;
      let dueAmount = 0;
      
      customerInvoices.forEach(invoice => {
        totalSpent += invoice.total_amount;
        if (invoice.status !== 'paid') {
          dueAmount += invoice.total_amount;
        }
      });

      // Pre-paid amount would come from advance payments (to be implemented)
      const prePaidAmount = 0; // Placeholder

      setPaymentSummary({
        dueAmount,
        prePaidAmount,
        totalSpent,
      });
    } catch (error) {
      console.error("Failed to fetch payment summary:", error);
      addToast("Failed to load payment summary", "error");
    } finally {
      setLoadingPayments(false);
    }
  }, [customerId, activeTab, addToast]);

  useEffect(() => {
    if (activeTab === "customer-payments") {
      fetchPaymentSummary();
    }
  }, [activeTab, fetchPaymentSummary]);

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
            ) : (
              <div className="space-y-6">
                {/* Payment Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Due Amount */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Due Amount</p>
                        <p className="text-2xl font-bold text-red-900">
                          PKR {paymentSummary.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                          PKR {paymentSummary.prePaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                          PKR {paymentSummary.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-600 mt-1">All-time sales</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Details</h3>
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Payment history will appear here</p>
                    <p className="text-xs mt-1 text-gray-400">
                      This section will show payment transactions and advance payments when available.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "transactions" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Related Transactions</h2>
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No transactions found for this customer.</p>
              <p className="text-xs mt-1 text-gray-400">
                This section will display invoices and payments when available.
              </p>
            </div>
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

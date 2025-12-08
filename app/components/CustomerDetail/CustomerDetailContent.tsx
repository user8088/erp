"use client";

import { useState } from "react";
import CustomerDetailTabs from "./CustomerDetailTabs";
import CustomerDetailsForm from "./CustomerDetailsForm";
import type { Customer } from "../../lib/types";

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
  const [activeTab, setActiveTab] = useState("customer-details");

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

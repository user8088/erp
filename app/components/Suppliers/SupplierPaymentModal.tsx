"use client";

import { useState, useEffect } from "react";
import { X, CreditCard, Sparkles } from "lucide-react";
import type { Account } from "../../lib/types";

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
  supplierId: number;
  outstandingBalance: number;
  paymentAccounts: Account[];
  onPaymentSubmit: (payment: PaymentData) => Promise<void>;
  onAutoDetectPaymentAccount?: () => Promise<number | null>;
}

export interface PaymentData {
  amount: number;
  payment_account_id: number;
  payment_date: string;
  invoice_number?: string;
  notes?: string;
  skip_invoice: boolean;
}

export default function SupplierPaymentModal({
  isOpen,
  onClose,
  supplierName,
  supplierId,
  outstandingBalance,
  paymentAccounts,
  onPaymentSubmit,
  onAutoDetectPaymentAccount,
}: SupplierPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentData>({
    amount: outstandingBalance,
    payment_account_id: 0,
    payment_date: new Date().toISOString().split('T')[0],
    invoice_number: "",
    notes: "",
    skip_invoice: false,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: outstandingBalance,
        payment_account_id: 0,
        payment_date: new Date().toISOString().split('T')[0],
        invoice_number: "",
        notes: "",
        skip_invoice: false,
      });
    }
  }, [isOpen, outstandingBalance]);

  const handleAutoDetect = async () => {
    if (!onAutoDetectPaymentAccount) return;
    
    const detectedAccountId = await onAutoDetectPaymentAccount();
    if (detectedAccountId) {
      setFormData({ ...formData, payment_account_id: detectedAccountId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate account balance
    const selectedAccount = paymentAccounts.find(acc => acc.id === formData.payment_account_id);
    if (selectedAccount && selectedAccount.balance !== null && selectedAccount.balance !== undefined) {
      if (formData.amount > selectedAccount.balance) {
        alert(`Insufficient balance in ${selectedAccount.name}. Available: PKR ${Number(selectedAccount.balance).toLocaleString()}`);
        return;
      }
    }
    
    setLoading(true);
    
    try {
      await onPaymentSubmit(formData);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  
  const selectedAccount = paymentAccounts.find(acc => acc.id === formData.payment_account_id);
  const hasInsufficientBalance = selectedAccount && 
    selectedAccount.balance !== null && 
    selectedAccount.balance !== undefined && 
    formData.amount > selectedAccount.balance;

  // Check if any account has enough balance for the full outstanding amount
  const maxAvailableBalance = Math.max(...paymentAccounts.map(acc => 
    acc.balance !== null && acc.balance !== undefined ? Number(acc.balance) : 0
  ), 0);
  const canPayFull = maxAvailableBalance >= outstandingBalance;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Make Payment</h2>
            <p className="text-sm text-gray-500 mt-1">
              Pay {supplierName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning: Insufficient Funds */}
          {!canPayFull && paymentAccounts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 text-xl">⚠️</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">Insufficient Funds</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Maximum available balance: PKR {maxAvailableBalance.toLocaleString()}. 
                    You can only make a partial payment of up to this amount.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Outstanding Balance Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Outstanding Balance</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  PKR {outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">PKR</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={outstandingBalance}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Outstanding: PKR {outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {selectedAccount && selectedAccount.balance !== null && selectedAccount.balance !== undefined && (
                  <span className="ml-2">
                    | Available: PKR {Number(selectedAccount.balance).toLocaleString()}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                {selectedAccount && selectedAccount.balance !== null && selectedAccount.balance !== undefined && 
                 formData.amount !== Math.min(outstandingBalance, Number(selectedAccount.balance)) && (
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      amount: Math.min(outstandingBalance, Number(selectedAccount.balance)) 
                    })}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Pay Max Available
                  </button>
                )}
                {formData.amount !== outstandingBalance && canPayFull && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: outstandingBalance })}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Pay Full Amount
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Payment Account */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Pay From Account <span className="text-red-500">*</span>
              </label>
              {onAutoDetectPaymentAccount && (
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Detect
                </button>
              )}
            </div>
            <select
              value={formData.payment_account_id}
              onChange={(e) => setFormData({ ...formData, payment_account_id: Number(e.target.value) })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                hasInsufficientBalance 
                  ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                  : 'border-gray-300 focus:ring-orange-500'
              }`}
              required
            >
              <option value={0}>Select payment account</option>
              {paymentAccounts.map((account) => {
                const balance = account.balance !== null && account.balance !== undefined ? Number(account.balance) : 0;
                const insufficient = formData.amount > balance;
                const accountLabel = `${account.number ? `${account.number} - ` : ""}${account.name} - Balance: PKR ${balance.toLocaleString()}${insufficient && formData.amount > 0 ? ' (Insufficient)' : ''}`;
                return (
                  <option 
                    key={account.id} 
                    value={account.id}
                    disabled={insufficient && formData.amount > 0}
                  >
                    {accountLabel}
                  </option>
                );
              })}
            </select>
            {hasInsufficientBalance && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                ⚠️ Insufficient balance! Available: PKR {Number(selectedAccount.balance).toLocaleString()} | Required: PKR {formData.amount.toLocaleString()}
              </p>
            )}
            {!hasInsufficientBalance && selectedAccount && (
              <p className="mt-1 text-xs text-green-600">
                ✓ Sufficient balance available
              </p>
            )}
            {!selectedAccount && (
              <p className="mt-1 text-xs text-gray-500">
                Select Cash, Bank, JazzCash, EasyPaisa, or any asset account to pay from
              </p>
            )}
          </div>

          {/* Invoice Number (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Supplier Invoice Number
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.skip_invoice}
                  onChange={(e) => setFormData({ ...formData, skip_invoice: e.target.checked })}
                  className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                Skip Invoice
              </label>
            </div>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              disabled={formData.skip_invoice}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., INV-2025-001"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.skip_invoice 
                ? "Payment will be recorded without invoice reference"
                : "Enter the invoice number from your supplier (optional)"}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Additional notes about this payment..."
            />
          </div>

          {/* Accounting Preview */}
          {formData.payment_account_id > 0 && formData.amount > 0 && !hasInsufficientBalance && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Journal Entry Preview:</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Account</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Debit</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Credit</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">New Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-3 py-2 text-gray-900">Accounts Payable</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formData.amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">—</td>
                      <td className="px-3 py-2 text-right text-xs text-green-600">
                        ↓ Reduced
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-900">
                        {selectedAccount?.name || "Payment Account"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">—</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formData.amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-blue-600">
                        {selectedAccount?.balance !== null && selectedAccount?.balance !== undefined && (
                          <>PKR {(Number(selectedAccount.balance) - formData.amount).toLocaleString()}</>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.payment_account_id || formData.amount <= 0 || hasInsufficientBalance}
              className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={hasInsufficientBalance ? "Insufficient balance in selected account" : ""}
            >
              {loading ? "Processing..." : hasInsufficientBalance ? "Insufficient Balance" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

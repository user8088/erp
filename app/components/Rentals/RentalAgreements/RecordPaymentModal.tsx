"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { RentalAgreement } from "../../../lib/types";
import { rentalApi, accountsApi } from "../../../lib/apiClient";
import { useToast } from "../../ui/ToastProvider";
import type { Account } from "../../../lib/types";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: RentalAgreement;
  onPaymentRecorded: () => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  agreement,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const { addToast } = useToast();
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Load payment accounts (cash/bank accounts)
      const loadAccounts = async () => {
        setLoadingAccounts(true);
        try {
          // Get accounts - filter for asset accounts that can be used for payments
          const accounts = await accountsApi.getAccountsTree(1, false);
          const cashBankAccounts = accounts.filter(
            (acc: Account) => 
              acc.root_type === "asset" && 
              !acc.is_group &&
              (acc.name.toLowerCase().includes("cash") || 
               acc.name.toLowerCase().includes("bank") ||
               acc.name.toLowerCase().includes("jazzcash") ||
               acc.name.toLowerCase().includes("easypaisa"))
          );
          setPaymentAccounts(cashBankAccounts);
          if (cashBankAccounts.length > 0) {
            setPaymentAccountId(cashBankAccounts[0].id);
          }
        } catch (e) {
          console.error("Failed to load payment accounts:", e);
        } finally {
          setLoadingAccounts(false);
        }
      };
      void loadAccounts();

      // Set default payment to first unpaid payment
      const firstUnpaid = agreement.payment_schedule?.find(p => p.payment_status !== "paid");
      if (firstUnpaid && agreement.payments) {
        const paymentRecord = agreement.payments.find(p => p.due_date === firstUnpaid.due_date);
        if (paymentRecord) {
          setSelectedPaymentId(paymentRecord.id);
          setAmountPaid(String(firstUnpaid.amount_due));
        }
      }
    }
  }, [isOpen, agreement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selectedPaymentId) {
      setErrors({ payment: "Please select a payment period." });
      return;
    }
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      setErrors({ amount: "Amount paid must be greater than 0." });
      return;
    }
    if (!paymentAccountId) {
      setErrors({ account: "Please select a payment account." });
      return;
    }

    setSubmitting(true);
    try {
      await rentalApi.recordPayment(agreement.id, {
        payment_id: selectedPaymentId,
        amount_paid: parseFloat(amountPaid),
        payment_date: paymentDate,
        payment_account_id: paymentAccountId,
        notes: notes.trim() || undefined,
      });

      addToast("Payment recorded successfully.", "success");
      onPaymentRecorded();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
            return;
          }
        }
      }
      
      addToast("Failed to record payment.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agreement
            </label>
            <p className="text-sm text-gray-900">{agreement.agreement_number}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Payment Period <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPaymentId || ""}
              onChange={(e) => {
                const paymentId = Number(e.target.value);
                setSelectedPaymentId(paymentId);
                const payment = agreement.payments?.find(p => p.id === paymentId);
                if (payment) {
                  setAmountPaid(String(payment.amount_due));
                }
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.payment ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select payment period</option>
              {agreement.payments?.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.period_identifier} - Due: {new Date(payment.due_date).toLocaleDateString()} - 
                  {formatCurrency(payment.amount_due)} ({payment.payment_status})
                </option>
              ))}
            </select>
            {errors.payment && (
              <p className="mt-1 text-sm text-red-600">{errors.payment}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.amount ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Account <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentAccountId || ""}
              onChange={(e) => setPaymentAccountId(Number(e.target.value))}
              disabled={loadingAccounts}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.account ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select payment account</option>
              {paymentAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number ? `${account.number} - ` : ""}{account.name}
                </option>
              ))}
            </select>
            {errors.account && (
              <p className="mt-1 text-sm text-red-600">{errors.account}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


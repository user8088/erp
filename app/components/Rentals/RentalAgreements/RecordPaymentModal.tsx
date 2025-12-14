"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RentalAgreement } from "../../../lib/types";
import { rentalApi } from "../../../lib/apiClient";
import { useToast } from "../../ui/ToastProvider";
import { useRentalAccountMappings } from "../Shared/useRentalAccountMappings";

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
  const router = useRouter();
  const { addToast } = useToast();
  const { mappings, loading: loadingMappings, getPaymentAccounts, isConfigured } = useRentalAccountMappings();
  const [fullAgreement, setFullAgreement] = useState<RentalAgreement | null>(null);
  const [loadingAgreement, setLoadingAgreement] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "card" | "other" | "">("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentAccounts = getPaymentAccounts();
  const agreementToUse = fullAgreement || agreement;

  // Fetch full agreement details when modal opens to get payments
  useEffect(() => {
    if (isOpen && agreement.id) {
      const fetchFullAgreement = async () => {
        setLoadingAgreement(true);
        try {
          const response = await rentalApi.getAgreement(agreement.id);
          setFullAgreement(response.agreement);
        } catch (error) {
          console.error("Failed to fetch agreement details:", error);
          // Continue with the agreement we have
        } finally {
          setLoadingAgreement(false);
        }
      };
      void fetchFullAgreement();
    }
  }, [isOpen, agreement.id]);

  useEffect(() => {
    if (isOpen && agreementToUse) {
      // Set default payment account from mappings
      if (mappings.cashAccount) {
        setPaymentAccountId(mappings.cashAccount.id);
      } else if (mappings.bankAccount) {
        setPaymentAccountId(mappings.bankAccount.id);
      } else if (paymentAccounts.length > 0) {
        setPaymentAccountId(paymentAccounts[0].id);
      }

      // Set default payment to first unpaid payment
      const firstUnpaid = agreementToUse.payment_schedule?.find(p => p.payment_status !== "paid");
      if (firstUnpaid && agreementToUse.payments && agreementToUse.payments.length > 0) {
        const paymentRecord = agreementToUse.payments.find(p => p.due_date === firstUnpaid.due_date);
        if (paymentRecord) {
          setSelectedPaymentId(paymentRecord.id);
          setAmountPaid(String(firstUnpaid.amount_due));
        }
      }
    }
  }, [isOpen, agreementToUse, mappings, paymentAccounts]);

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

    // Check if payment accounts are configured
    if (!isConfigured.cash && !isConfigured.bank) {
      setErrors({ 
        account: "Payment accounts are not configured. Please configure rental cash or bank account in Rental Settings." 
      });
      return;
    }

    setSubmitting(true);
    try {
      await rentalApi.recordPayment(agreementToUse.id, {
        payment_id: selectedPaymentId,
        amount_paid: parseFloat(amountPaid),
        payment_date: paymentDate,
        payment_account_id: paymentAccountId,
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
      });

      addToast("Payment recorded successfully.", "success");
      onPaymentRecorded();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object") {
          // Check for specific error messages
          if ("message" in errorData && typeof errorData.message === "string") {
            const message = errorData.message.toLowerCase();
            if (message.includes("account") || message.includes("mapping") || message.includes("receivable")) {
              addToast(
                `${errorData.message} Please configure accounts in Rental Settings.`,
                "error"
              );
              return;
            }
            addToast(errorData.message, "error");
            return;
          }
          if ("errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
              if (firstError.toLowerCase().includes("account") || firstError.toLowerCase().includes("mapping")) {
                addToast(
                  `${firstError} Please configure accounts in Rental Settings.`,
                  "error"
                );
              } else {
            addToast(firstError, "error");
              }
            return;
            }
          }
        }
      }
      
      addToast("Failed to record payment. Please check that all required account mappings are configured in Rental Settings.", "error");
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
            <p className="text-sm text-gray-900">{agreementToUse.agreement_number}</p>
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
                const payment = agreementToUse.payments?.find(p => p.id === paymentId);
                if (payment) {
                  setAmountPaid(String(payment.amount_due));
                }
              }}
              disabled={loadingAgreement}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.payment ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">
                {loadingAgreement ? "Loading payment periods..." : "Select payment period"}
              </option>
              {loadingAgreement ? null : agreementToUse.payments && agreementToUse.payments.length > 0 ? (
                agreementToUse.payments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.period_identifier} - Due: {new Date(payment.due_date).toLocaleDateString()} - 
                  {formatCurrency(payment.amount_due)} ({payment.payment_status})
                </option>
                ))
              ) : (
                <option value="" disabled>
                  No payment periods available
                </option>
              )}
            </select>
            {errors.payment && (
              <p className="mt-1 text-sm text-red-600">{errors.payment}</p>
            )}
            {!loadingAgreement && agreementToUse.payments && agreementToUse.payments.length === 0 && (
              <p className="mt-1 text-sm text-orange-600">
                No payment periods found. Payment records should be created automatically when the agreement is created.
              </p>
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
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "cash" | "bank_transfer" | "cheque" | "card" | "other" | "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select payment method (optional)</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Account <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentAccountId || ""}
              onChange={(e) => setPaymentAccountId(Number(e.target.value))}
              disabled={loadingMappings}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.account ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select payment account</option>
              {paymentAccounts.length === 0 ? (
                <option value="" disabled>
                  {loadingMappings ? "Loading accounts..." : "No payment accounts configured. Please configure in Rental Settings."}
                </option>
              ) : (
                paymentAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number ? `${account.number} - ` : ""}{account.name}
                </option>
                ))
              )}
            </select>
            {errors.account && (
              <p className="mt-1 text-sm text-red-600">{errors.account}</p>
            )}
            {paymentAccounts.length === 0 && !loadingMappings && (
              <p className="mt-1 text-xs text-orange-600">
                No payment accounts configured.{" "}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/rental/settings");
                  }}
                  className="underline hover:text-orange-700"
                >
                  Configure in Rental Settings
                </button>
              </p>
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


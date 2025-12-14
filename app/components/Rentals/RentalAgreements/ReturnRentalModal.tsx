"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RentalAgreement } from "../../../lib/types";
import { rentalApi } from "../../../lib/apiClient";
import { useToast } from "../../ui/ToastProvider";
import { useRentalAccountMappings } from "../Shared/useRentalAccountMappings";

interface ReturnRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: RentalAgreement;
  onReturnProcessed: () => void;
}

export default function ReturnRentalModal({
  isOpen,
  onClose,
  agreement,
  onReturnProcessed,
}: ReturnRentalModalProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { mappings, loading: loadingMappings, getRefundAccounts, isConfigured } = useRentalAccountMappings();
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [returnCondition, setReturnCondition] = useState<"returned_safely" | "damaged" | "lost">("returned_safely");
  const [damageChargeAmount, setDamageChargeAmount] = useState<string>("0");
  const [damageDescription, setDamageDescription] = useState<string>("");
  const [securityDepositRefunded, setSecurityDepositRefunded] = useState<string>("");
  const [refundAccountId, setRefundAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refundAccounts = getRefundAccounts();

  useEffect(() => {
    if (isOpen) {
      // Set default refund account from mappings
      if (mappings.cashAccount) {
        setRefundAccountId(mappings.cashAccount.id);
      } else if (mappings.bankAccount) {
        setRefundAccountId(mappings.bankAccount.id);
      } else if (refundAccounts.length > 0) {
        setRefundAccountId(refundAccounts[0].id);
      }

      // Calculate default refund
      const defaultRefund = agreement.security_deposit_amount - parseFloat(damageChargeAmount || "0");
      setSecurityDepositRefunded(String(Math.max(0, defaultRefund)));
    }
  }, [isOpen, agreement, mappings, refundAccounts, damageChargeAmount]);

  // Recalculate refund when damage charge changes
  useEffect(() => {
    const damageCharge = parseFloat(damageChargeAmount || "0");
    const refund = agreement.security_deposit_amount - damageCharge;
    setSecurityDepositRefunded(String(Math.max(0, refund)));
  }, [damageChargeAmount, agreement.security_deposit_amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!refundAccountId) {
      setErrors({ account: "Please select a refund account." });
      return;
    }

    // Check if refund accounts are configured
    if (!isConfigured.cash && !isConfigured.bank) {
      setErrors({ 
        account: "Refund accounts are not configured. Please configure rental cash or bank account in Rental Settings." 
      });
      return;
    }

    // Check if required accounts are configured
    if (!isConfigured.securityDeposits || !isConfigured.income) {
      setErrors({ 
        account: "Required accounts are not configured. Please configure security deposits and rental income accounts in Rental Settings." 
      });
      return;
    }

    setSubmitting(true);
    try {
      await rentalApi.processReturn({
        rental_agreement_id: agreement.id,
        return_date: returnDate,
        return_condition: returnCondition,
        damage_charge_amount: parseFloat(damageChargeAmount || "0"),
        security_deposit_refunded: parseFloat(securityDepositRefunded || "0"),
        damage_description: damageDescription.trim() || undefined,
        refund_account_id: refundAccountId,
        notes: notes.trim() || undefined,
      });

      addToast("Rental return processed successfully.", "success");
      onReturnProcessed();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object") {
          // Check for specific error messages
          if ("message" in errorData && typeof errorData.message === "string") {
            const message = errorData.message.toLowerCase();
            if (message.includes("account") || message.includes("mapping") || message.includes("security") || message.includes("income")) {
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
      
      addToast("Failed to process rental return. Please check that all required account mappings are configured in Rental Settings.", "error");
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Return Rental Item</h2>
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
              Return Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Return Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value as "returned_safely" | "damaged" | "lost")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="returned_safely">Normal / Returned Safely</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {(returnCondition === "damaged" || returnCondition === "lost") && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damage Charge Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={damageChargeAmount}
                  onChange={(e) => setDamageChargeAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damage Description
                </label>
                <textarea
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe the damage or loss"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Security Deposit Amount
            </label>
            <p className="text-sm text-gray-900">{formatCurrency(agreement.security_deposit_amount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Security Deposit Refunded
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={agreement.security_deposit_amount}
              value={securityDepositRefunded}
              onChange={(e) => setSecurityDepositRefunded(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Auto-calculated: {formatCurrency(agreement.security_deposit_amount)} - {formatCurrency(parseFloat(damageChargeAmount || "0"))} = {formatCurrency(parseFloat(securityDepositRefunded || "0"))}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Account <span className="text-red-500">*</span>
            </label>
            <select
              value={refundAccountId || ""}
              onChange={(e) => setRefundAccountId(Number(e.target.value))}
              disabled={loadingMappings}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.account ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select refund account</option>
              {refundAccounts.length === 0 ? (
                <option value="" disabled>
                  {loadingMappings ? "Loading accounts..." : "No refund accounts configured. Please configure in Rental Settings."}
                </option>
              ) : (
                refundAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.number ? `${account.number} - ` : ""}{account.name}
                  </option>
                ))
              )}
            </select>
            {errors.account && (
              <p className="mt-1 text-sm text-red-600">{errors.account}</p>
            )}
            {refundAccounts.length === 0 && !loadingMappings && (
              <p className="mt-1 text-xs text-orange-600">
                No refund accounts configured.{" "}
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
              {submitting ? "Processing..." : "Process Return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


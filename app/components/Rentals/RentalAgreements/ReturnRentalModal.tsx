"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { RentalAgreement, Account } from "../../../lib/types";
import { rentalApi, accountsApi } from "../../../lib/apiClient";
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
  const { addToast } = useToast();
  const { mappings, loading: loadingMappings, isConfigured } = useRentalAccountMappings();
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [returnCondition, setReturnCondition] = useState<"returned_safely" | "damaged" | "lost">("returned_safely");
  const [damageChargeAmount, setDamageChargeAmount] = useState<string>("0");
  const [damageDescription, setDamageDescription] = useState<string>("");
  const [securityDepositRefunded, setSecurityDepositRefunded] = useState<string>("");
  const [refundAccountId, setRefundAccountId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refundAccounts, setRefundAccounts] = useState<Account[]>([]);
  const [loadingRefundAccounts, setLoadingRefundAccounts] = useState(false);

  // Fetch refund accounts - show all asset accounts (dynamic COA)
  // Always prioritize the security deposit payment account from the agreement
  useEffect(() => {
    const fetchRefundAccounts = async () => {
      if (!isOpen) return;
      
      setLoadingRefundAccounts(true);
      try {
        const response = await accountsApi.getAccounts({
          company_id: 1,
          root_type: 'asset',
          is_group: false,
          per_page: 1000,
        });
        
        // Filter out disabled accounts only
        let allAssetAccounts = response.data.filter(acc => !acc.is_disabled);
        
        // If the original security deposit account is not in the list (e.g. different root type),
        // and we have the account object, add it to the list
        if (agreement.security_deposit_payment_account && 
            !allAssetAccounts.some(acc => acc.id === agreement.security_deposit_payment_account?.id)) {
          allAssetAccounts.push(agreement.security_deposit_payment_account);
        }
        
        // Sort: security deposit payment account first, then others
        const sortedAccounts = [...allAssetAccounts].sort((a, b) => {
          const depositAccountId = agreement.security_deposit_payment_account_id || agreement.security_deposit_payment_account?.id;
          if (depositAccountId) {
            if (a.id === depositAccountId) return -1;
            if (b.id === depositAccountId) return 1;
          }
          return 0;
        });
        
        setRefundAccounts(sortedAccounts);
      } catch (error) {
        console.error("Failed to fetch refund accounts:", error);
        addToast("Failed to load refund accounts", "error");
      } finally {
        setLoadingRefundAccounts(false);
      }
    };

    if (isOpen) {
      fetchRefundAccounts();
    }
  }, [isOpen, agreement.security_deposit_payment_account_id, agreement.security_deposit_payment_account, addToast]);

  useEffect(() => {
    if (isOpen && refundAccounts.length > 0) {
      // ALWAYS prioritize the security deposit payment account from the agreement
      const depositAccountId = agreement.security_deposit_payment_account_id || agreement.security_deposit_payment_account?.id;
      
      if (depositAccountId) {
        const depositAccount = refundAccounts.find(
          acc => acc.id === depositAccountId
        );
        if (depositAccount) {
          setRefundAccountId(depositAccount.id);
          // Calculate default refund
          const defaultRefund = agreement.security_deposit_amount - parseFloat(damageChargeAmount || "0");
          setSecurityDepositRefunded(String(Math.max(0, defaultRefund)));
          return;
        }
      }
      
      // Fallback to mapped accounts or first available
      if (mappings.cashAccount && refundAccounts.some(a => a.id === mappings.cashAccount!.id)) {
        setRefundAccountId(mappings.cashAccount.id);
      } else if (mappings.bankAccount && refundAccounts.some(a => a.id === mappings.bankAccount!.id)) {
        setRefundAccountId(mappings.bankAccount.id);
      } else if (refundAccounts.length > 0) {
        setRefundAccountId(refundAccounts[0].id);
      }

      // Calculate default refund
      const defaultRefund = agreement.security_deposit_amount - parseFloat(damageChargeAmount || "0");
      setSecurityDepositRefunded(String(Math.max(0, defaultRefund)));
    }
  }, [isOpen, agreement.security_deposit_payment_account_id, agreement.security_deposit_payment_account, agreement.security_deposit_amount, mappings, refundAccounts, damageChargeAmount]);

  // Recalculate refund when damage charge or condition changes
  useEffect(() => {
    if (returnCondition === "lost") {
      setDamageChargeAmount(String(agreement.security_deposit_amount));
      setSecurityDepositRefunded("0");
    } else {
      const damageCharge = parseFloat(damageChargeAmount || "0");
      const refund = agreement.security_deposit_amount - damageCharge;
      setSecurityDepositRefunded(String(Math.max(0, refund)));
    }
  }, [damageChargeAmount, agreement.security_deposit_amount, returnCondition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const refundAmount = parseFloat(securityDepositRefunded || "0");

    if (refundAmount > 0 && !refundAccountId) {
      setErrors({ account: "Please select a refund account." });
      return;
    }

    // Check if required accounts are configured
    if (!isConfigured.securityDeposits || !isConfigured.income) {
      setErrors({ 
        account: "Required accounts are not configured. Please configure security deposits and rental income accounts in Rental Settings." 
      });
      return;
    }

    // Check for loss account if item is lost
    if (returnCondition === "lost" && !isConfigured.loss) {
      setErrors({
        account: "Rental Asset Loss account is not configured. Please configure it in Rental Settings to process lost items."
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
        security_deposit_refunded: refundAmount,
        damage_description: damageDescription.trim() || undefined,
        refund_account_id: refundAccountId || undefined,
        notes: notes.trim() || undefined,
      });

      addToast("Rental return processed successfully.", "success");
      onReturnProcessed();
      onClose();
    } catch (e: unknown) {
      console.error("Return error:", e);
      let errorMessage = "Failed to process rental return.";
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as any).data;
        if (errorData && typeof errorData === "object") {
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData.errors) {
            const firstError = Object.values(errorData.errors)[0]?.[0];
            if (firstError) errorMessage = firstError;
          }
        }
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      
      addToast(errorMessage, "error");
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

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">
                Outstanding
              </label>
              <p className="text-sm font-semibold text-red-600">{formatCurrency(agreement.outstanding_balance)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">
                Advance
              </label>
              <p className="text-sm font-semibold text-blue-600">{formatCurrency(agreement.advance_balance)}</p>
            </div>
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
            {returnCondition === "lost" && (
              <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-800">
                <strong>Note:</strong> Marking an item as lost will permanently decrement the total asset quantity in the system.
              </div>
            )}
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
              Calculation: {formatCurrency(agreement.security_deposit_amount)} (Deposit) - {formatCurrency(parseFloat(damageChargeAmount || "0"))} (Charge) = {formatCurrency(parseFloat(securityDepositRefunded || "0"))} (Refund)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Account {parseFloat(securityDepositRefunded || "0") > 0 && <span className="text-red-500">*</span>}
            </label>
            <select
              value={refundAccountId || ""}
              onChange={(e) => setRefundAccountId(Number(e.target.value))}
              disabled={loadingRefundAccounts || loadingMappings}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.account ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select refund account</option>
              {loadingRefundAccounts ? (
                <option value="" disabled>
                  Loading accounts...
                </option>
              ) : refundAccounts.length === 0 ? (
                <option value="" disabled>
                  No refund accounts available. Please configure cash or bank accounts in Chart of Accounts.
                </option>
              ) : (
                refundAccounts.map((account) => {
                  const depositAccountId = agreement.security_deposit_payment_account_id || agreement.security_deposit_payment_account?.id;
                  return (
                    <option key={account.id} value={account.id}>
                      {account.number ? `${account.number} - ` : ""}{account.name}
                      {depositAccountId === account.id ? " (Original deposit account)" : ""}
                    </option>
                  );
                })
              )}
            </select>
            {errors.account && (
              <p className="mt-1 text-sm text-red-600">{errors.account}</p>
            )}
            {!loadingRefundAccounts && agreement.security_deposit_payment_account_id && (
              <p className="mt-1 text-xs text-gray-500">
                The original security deposit account has been auto-selected. You can change it if needed.
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


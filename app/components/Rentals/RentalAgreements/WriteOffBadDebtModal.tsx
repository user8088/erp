"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { RentalAgreement } from "../../../lib/types";
import { rentalApi } from "../../../lib/apiClient";
import { useToast } from "../../ui/ToastProvider";

interface WriteOffBadDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: RentalAgreement;
  onWriteOffComplete: () => void;
}

export default function WriteOffBadDebtModal({
  isOpen,
  onClose,
  agreement,
  onWriteOffComplete,
}: WriteOffBadDebtModalProps) {
  const { addToast } = useToast();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (agreement.outstanding_balance <= 0) {
      addToast("This agreement has no outstanding balance to write off.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await rentalApi.writeOffBadDebt(agreement.id, { notes: notes.trim() || undefined });
      addToast("Bad debt written off successfully.", "success");
      onWriteOffComplete();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to write off bad debt:", error);
      let errorMessage = "Failed to write off bad debt.";
      if (error && typeof error === "object" && "data" in error) {
        const errorData = (error as { data: any }).data;
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Write-off Bad Debt
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-md p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action will clear the entire outstanding balance of <strong>{formatCurrency(agreement.outstanding_balance)}</strong> and record it as a loss. This action cannot be undone.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agreement
            </label>
            <p className="text-sm text-gray-900 font-medium">{agreement.agreement_number}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <p className="text-sm text-gray-900">{agreement.customer?.name || "—"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Write-off Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Reason for write-off (e.g. customer defaulted, untraceable)"
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
              disabled={submitting || agreement.outstanding_balance <= 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm Write-off"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

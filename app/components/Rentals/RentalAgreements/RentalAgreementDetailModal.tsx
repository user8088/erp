"use client";

import { X } from "lucide-react";
import type { RentalAgreement } from "../../../lib/types";
import PaymentStatusBadge from "../Shared/PaymentStatusBadge";

interface RentalAgreementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: RentalAgreement;
  onRefresh?: () => void;
}

export default function RentalAgreementDetailModal({
  isOpen,
  onClose,
  agreement,
}: RentalAgreementDetailModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Rental Agreement Details - {agreement.agreement_number}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Customer</label>
              <p className="text-sm text-gray-900 mt-1">{agreement.customer?.name || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Rental Item</label>
              <p className="text-sm text-gray-900 mt-1">{agreement.rental_item?.name || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Quantity Rented</label>
              <p className="text-sm text-gray-900 mt-1">{agreement.quantity_rented}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Rental Period</label>
              <p className="text-sm text-gray-900 mt-1">
                {agreement.rental_period_length} {agreement.rental_period_type}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(agreement.rental_start_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">End Date</label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(agreement.rental_end_date)}</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Financial Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Total Rent Amount</label>
                <p className="text-sm text-gray-900 mt-1 font-semibold">{formatCurrency(agreement.total_rent_amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Rent Per Period</label>
                <p className="text-sm text-gray-900 mt-1">{formatCurrency(agreement.rent_per_period)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Security Deposit</label>
                <p className="text-sm text-gray-900 mt-1">{formatCurrency(agreement.security_deposit_amount)}</p>
                {agreement.security_deposit_collected_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Collected: {formatDate(agreement.security_deposit_collected_date)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Outstanding Balance</label>
                <p className="text-sm text-red-600 mt-1 font-semibold">{formatCurrency(agreement.outstanding_balance)}</p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          {agreement.payment_schedule && agreement.payment_schedule.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Schedule</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Due Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Amount Due</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agreement.payment_schedule.map((schedule) => (
                      <tr key={schedule.period}>
                        <td className="px-4 py-2 text-sm text-gray-900">Period {schedule.period}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(schedule.due_date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(schedule.amount_due)}</td>
                        <td className="px-4 py-2">
                          <PaymentStatusBadge status={schedule.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment History */}
          {agreement.payments && agreement.payments.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Period</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Due Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Amount Due</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Amount Paid</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Payment Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Payment Method</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {agreement.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{payment.period_identifier}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDate(payment.due_date)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(payment.amount_due)}</td>
                        <td className="px-4 py-2 text-sm text-green-600">{formatCurrency(payment.amount_paid)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {payment.payment_date ? formatDate(payment.payment_date) : "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {payment.payment_method ? (
                            <span className="capitalize">{payment.payment_method.replace("_", " ")}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <PaymentStatusBadge status={payment.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { Eye, DollarSign, Package } from "lucide-react";
import type { RentalAgreement } from "../../../lib/types";
import StatusBadge from "../Shared/StatusBadge";
import PaymentStatusBadge from "../Shared/PaymentStatusBadge";

interface RentalAgreementsTableProps {
  agreements: RentalAgreement[];
  loading?: boolean;
  onViewDetails?: (agreement: RentalAgreement) => void;
  onRecordPayment?: (agreement: RentalAgreement) => void;
  onReturnRental?: (agreement: RentalAgreement) => void;
}

export default function RentalAgreementsTable({ 
  agreements, 
  loading, 
  onViewDetails,
  onRecordPayment,
  onReturnRental,
}: RentalAgreementsTableProps) {
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

  const getPaymentStatus = (agreement: RentalAgreement): "paid" | "partially_paid" | "late" | "unpaid" => {
    if (agreement.outstanding_balance === 0) {
      return "paid";
    }
    const paidAmount = agreement.total_rent_amount - agreement.outstanding_balance;
    if (paidAmount > 0 && paidAmount < agreement.total_rent_amount) {
      // Check if any payment is overdue
      const today = new Date();
      const hasOverdue = agreement.payment_schedule?.some(
        (schedule) => schedule.payment_status === "late" || 
        (schedule.payment_status === "unpaid" && new Date(schedule.due_date) < today)
      );
      return hasOverdue ? "late" : "partially_paid";
    }
    // Check if any payment is overdue
    const today = new Date();
    const hasOverdue = agreement.payment_schedule?.some(
      (schedule) => schedule.payment_status === "late" || 
      (schedule.payment_status === "unpaid" && new Date(schedule.due_date) < today)
    );
    return hasOverdue ? "late" : "unpaid";
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && agreements.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading rental agreements...</div>
      )}
      <table className="w-full min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Agreement #</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental Item</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Quantity</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Start Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">End Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Total Rent</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Paid</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Due</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Payment Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {agreements.map((agreement) => {
            const paidAmount = agreement.total_rent_amount - agreement.outstanding_balance;
            const paymentStatus = getPaymentStatus(agreement);
            return (
              <tr key={agreement.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                  {agreement.agreement_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {agreement.customer?.name || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {agreement.rental_item?.name || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {agreement.quantity_rented}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(agreement.rental_start_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(agreement.rental_end_date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {formatCurrency(agreement.total_rent_amount)}
                </td>
                <td className="px-4 py-3 text-sm text-green-600 whitespace-nowrap">
                  {formatCurrency(paidAmount)}
                </td>
                <td className="px-4 py-3 text-sm text-red-600 whitespace-nowrap">
                  {formatCurrency(agreement.outstanding_balance)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PaymentStatusBadge status={paymentStatus} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={agreement.rental_status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(agreement)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {onRecordPayment && agreement.rental_status === "active" && (
                      <button
                        onClick={() => onRecordPayment(agreement)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Record Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}
                    {onReturnRental && (agreement.rental_status === "active" || agreement.rental_status === "overdue") && (
                      <button
                        onClick={() => onReturnRental(agreement)}
                        className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title="Return Rental"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {!loading && agreements.length === 0 && (
            <tr>
              <td
                colSpan={12}
                className="px-4 py-6 text-sm text-gray-500 text-center"
              >
                No rental agreements found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


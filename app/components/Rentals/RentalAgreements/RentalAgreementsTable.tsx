"use client";

import type { RentalAgreement } from "../../../lib/types";
import StatusBadge from "../Shared/StatusBadge";
import PaymentStatusBadge from "../Shared/PaymentStatusBadge";

interface RentalAgreementsTableProps {
  agreements: RentalAgreement[];
  loading?: boolean;
  onViewDetails?: (agreement: RentalAgreement) => void;
}

export default function RentalAgreementsTable({ 
  agreements, 
  loading, 
  onViewDetails,
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
    // Calculate paid amount from payments
    const paidAmount = agreement.payments?.reduce((sum, payment) => sum + payment.amount_paid, 0) || 0;
    if (paidAmount > 0) {
      return "partially_paid";
    }
    return "unpaid";
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
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Period Type</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Start Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Outstanding Balance</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Payment Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {agreements.map((agreement) => {
            const paymentStatus = getPaymentStatus(agreement);
            return (
              <tr 
                key={agreement.id} 
                onClick={() => onViewDetails?.(agreement)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
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
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap capitalize">
                  {agreement.rental_period_type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {formatDate(agreement.rental_start_date)}
                </td>
                <td className="px-4 py-3 text-sm text-red-600 whitespace-nowrap font-semibold">
                  {formatCurrency(agreement.outstanding_balance)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PaymentStatusBadge status={paymentStatus} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={agreement.rental_status} />
                </td>
              </tr>
            );
          })}
          {!loading && agreements.length === 0 && (
            <tr>
              <td
                colSpan={9}
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


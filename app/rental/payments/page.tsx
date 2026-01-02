"use client";

import { useState } from "react";
import { RefreshCw, Eye, DollarSign } from "lucide-react";
import { useRentalAgreementsList, invalidateRentalAgreementsCache } from "../../components/Rentals/RentalAgreements/useRentalAgreementsList";
import PaymentStatusBadge from "../../components/Rentals/Shared/PaymentStatusBadge";
import RentalAgreementDetailModal from "../../components/Rentals/RentalAgreements/RentalAgreementDetailModal";
import RecordPaymentModal from "../../components/Rentals/RentalAgreements/RecordPaymentModal";
import { useRouter } from "next/navigation";
import type { RentalAgreement } from "../../lib/types";

export default function RentalPaymentsPage() {
  const router = useRouter();
  const {
    agreements,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
    filters,
    setFilters,
    refresh,
  } = useRentalAgreementsList();

  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleViewDetails = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowDetailModal(true);
  };

  const handleRecordPayment = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowPaymentModal(true);
  };

  const handleCloseModals = () => {
    setShowDetailModal(false);
    setShowPaymentModal(false);
    setSelectedAgreement(null);
  };

  const handleRefresh = () => {
    invalidateRentalAgreementsCache();
    refresh();
  };

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

  const getLastPaymentDate = (agreement: RentalAgreement): string | null => {
    if (!agreement.payments || agreement.payments.length === 0) return null;
    const paidPayments = agreement.payments
      .filter(p => p.payment_date)
      .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime());
    return paidPayments[0]?.payment_date || null;
  };

  // Flatten agreements to show payment summary
  const paymentSummaries = agreements.map(agreement => {
    // Calculate paid amount from payments
    const paidAmount = agreement.payments?.reduce((sum, payment) => sum + payment.amount_paid, 0) || 0;
    return {
      agreement,
      paidAmount,
      remainingDue: agreement.outstanding_balance,
      lastPaymentDate: getLastPaymentDate(agreement),
      paymentStatus: getPaymentStatus(agreement),
    };
  });

  const lastPage = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="max-w-full mx-auto min-h-full">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && paymentSummaries.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading payment information...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Paid Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Remaining Due</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Last Payment Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Payment Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paymentSummaries.map((summary) => (
              <tr key={summary.agreement.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                  {summary.agreement.agreement_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {summary.agreement.customer?.name || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-green-600 whitespace-nowrap">
                  {formatCurrency(summary.paidAmount)}
                </td>
                <td className="px-4 py-3 text-sm text-red-600 whitespace-nowrap">
                  {formatCurrency(summary.remainingDue)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PaymentStatusBadge status={summary.paymentStatus} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(summary.agreement)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View Agreement"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {summary.agreement.rental_status === "active" && (
                      <button
                        onClick={() => handleRecordPayment(summary.agreement)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Add Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && paymentSummaries.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {start} to {end} of {total} agreements
          </div>
          <div className="flex items-center gap-3">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-gray-600">
                Page {page} of {lastPage}
              </span>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedAgreement && (
        <>
          <RentalAgreementDetailModal
            isOpen={showDetailModal}
            onClose={handleCloseModals}
            agreement={selectedAgreement}
            onRefresh={handleRefresh}
          />
          <RecordPaymentModal
            isOpen={showPaymentModal}
            onClose={handleCloseModals}
            agreement={selectedAgreement}
            onPaymentRecorded={handleRefresh}
          />
        </>
      )}
    </div>
  );
}


"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, DollarSign, Package, RefreshCw, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { rentalApi } from "../../lib/apiClient";
import type { RentalAgreement } from "../../lib/types";
import StatusBadge from "../Rentals/Shared/StatusBadge";
import PaymentStatusBadge from "../Rentals/Shared/PaymentStatusBadge";
import RentalAgreementDetailModal from "../Rentals/RentalAgreements/RentalAgreementDetailModal";
import RecordPaymentModal from "../Rentals/RentalAgreements/RecordPaymentModal";
import ReturnRentalModal from "../Rentals/RentalAgreements/ReturnRentalModal";

interface CustomerRentalsProps {
  customerId: number;
}

export default function CustomerRentals({ customerId }: CustomerRentalsProps) {
  const router = useRouter();
  const [agreements, setAgreements] = useState<RentalAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rentalApi.getAgreements({
        customer_id: customerId,
        page,
        per_page: perPage,
        sort_by: "created_at",
        sort_order: "desc",
      });
      setAgreements(data.data);
      setTotal(data.meta.total);
    } catch (e) {
      console.error("Failed to load rental agreements:", e);
      setError("Failed to load rental agreements.");
    } finally {
      setLoading(false);
    }
  }, [customerId, page, perPage]);

  useEffect(() => {
    if (customerId) {
      void fetchAgreements();
    }
  }, [customerId, fetchAgreements]);

  const handleViewDetails = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowDetailModal(true);
  };

  const handleRecordPayment = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowPaymentModal(true);
  };

  const handleReturnRental = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowReturnModal(true);
  };

  const handleCloseModals = () => {
    setShowDetailModal(false);
    setShowPaymentModal(false);
    setShowReturnModal(false);
    setSelectedAgreement(null);
    void fetchAgreements(); // Refresh after any action
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
    const paidAmount = agreement.total_rent_amount - agreement.outstanding_balance;
    if (paidAmount > 0 && paidAmount < agreement.total_rent_amount) {
      const today = new Date();
      const hasOverdue = agreement.payment_schedule?.some(
        (schedule) => schedule.payment_status === "late" || 
        (schedule.payment_status === "unpaid" && new Date(schedule.due_date) < today)
      );
      return hasOverdue ? "late" : "partially_paid";
    }
    const today = new Date();
    const hasOverdue = agreement.payment_schedule?.some(
      (schedule) => schedule.payment_status === "late" || 
      (schedule.payment_status === "unpaid" && new Date(schedule.due_date) < today)
    );
    return hasOverdue ? "late" : "unpaid";
  };

  // Calculate summary statistics
  const activeRentals = agreements.filter(a => a.rental_status === "active").length;
  const totalOutstanding = agreements.reduce((sum, a) => sum + (Number(a.outstanding_balance) || 0), 0);
  const totalRentAmount = agreements.reduce((sum, a) => sum + (Number(a.total_rent_amount) || 0), 0);
  const totalPaid = totalRentAmount - totalOutstanding;

  const lastPage = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Rental Agreements</h2>
          <p className="text-sm text-gray-500 mt-1">
            Complete rental history and details for this customer
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void fetchAgreements()}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/rental/agreements/new")}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
          >
            <Package className="w-4 h-4" />
            New Rental
          </button>
          <button
            type="button"
            onClick={() => router.push("/rental/agreements")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            View All Rentals
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && agreements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-700 mb-1">Total Agreements</p>
            <p className="text-2xl font-bold text-blue-900">{agreements.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-xs font-medium text-green-700 mb-1">Active Rentals</p>
            <p className="text-2xl font-bold text-green-900">{activeRentals}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-xs font-medium text-orange-700 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-orange-900">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs font-medium text-red-700 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-red-900">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Agreements Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && agreements.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading rental agreements...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Agreement #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental Item</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Quantity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Start Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">End Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Total Rent</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Paid</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Due</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Security Deposit</th>
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
                    {agreement.rental_item?.name || "—"}
                    {agreement.rental_item?.sku && (
                      <span className="text-xs text-gray-500 ml-2">({agreement.rental_item.sku})</span>
                    )}
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
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {agreement.security_deposit_amount > 0 ? (
                      <>
                        {formatCurrency(agreement.security_deposit_amount)}
                        {agreement.security_deposit_collected > 0 && (
                          <span className="text-xs text-green-600 ml-1">
                            (Collected: {formatCurrency(agreement.security_deposit_collected)})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PaymentStatusBadge status={paymentStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={agreement.rental_status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(agreement)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {agreement.rental_status === "active" && (
                        <button
                          onClick={() => handleRecordPayment(agreement)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Record Payment"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      {(agreement.rental_status === "active" || agreement.rental_status === "overdue" || agreement.rental_status === "completed") && (
                        <button
                          onClick={() => handleReturnRental(agreement)}
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
                  className="px-4 py-12 text-sm text-gray-500 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-12 h-12 text-gray-300" />
                    <p>No rental agreements found for this customer.</p>
                    <button
                      onClick={() => router.push("/rental/agreements/new")}
                      className="mt-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
                    >
                      Create First Rental Agreement
                    </button>
                  </div>
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
            onRefresh={() => void fetchAgreements()}
            onRecordPayment={handleRecordPayment}
            onReturnRental={handleReturnRental}
          />
          <RecordPaymentModal
            isOpen={showPaymentModal}
            onClose={handleCloseModals}
            agreement={selectedAgreement}
            onPaymentRecorded={() => void fetchAgreements()}
          />
          <ReturnRentalModal
            isOpen={showReturnModal}
            onClose={handleCloseModals}
            agreement={selectedAgreement}
            onReturnProcessed={() => void fetchAgreements()}
          />
        </>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Plus, RefreshCw, Filter, X } from "lucide-react";
import { useRentalAgreementsList, invalidateRentalAgreementsCache } from "../../components/Rentals/RentalAgreements/useRentalAgreementsList";
import RentalAgreementsTable from "../../components/Rentals/RentalAgreements/RentalAgreementsTable";
import RentalAgreementDetailModal from "../../components/Rentals/RentalAgreements/RentalAgreementDetailModal";
import RecordPaymentModal from "../../components/Rentals/RentalAgreements/RecordPaymentModal";
import ReturnRentalModal from "../../components/Rentals/RentalAgreements/ReturnRentalModal";
import RentalAccountingStatusBanner from "../../components/Rentals/Shared/RentalAccountingStatusBanner";
import type { RentalAgreement } from "../../lib/types";
import { useRouter } from "next/navigation";

export default function RentalAgreementsPage() {
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

  const [showFilters, setShowFilters] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const handleViewDetails = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowDetailModal(true);
  };

  const handleRecordPayment = (agreement: RentalAgreement) => {
    setShowDetailModal(false);
    setSelectedAgreement(agreement);
    setShowPaymentModal(true);
  };

  const handleReturnRental = (agreement: RentalAgreement) => {
    setShowDetailModal(false);
    setSelectedAgreement(agreement);
    setShowReturnModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAgreement(null);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAgreement(null);
  };

  const handleCloseReturnModal = () => {
    setShowReturnModal(false);
    setSelectedAgreement(null);
  };

  const handleRefresh = () => {
    invalidateRentalAgreementsCache();
    refresh();
  };

  const lastPage = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="max-w-full mx-auto min-h-full">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {filters.search || filters.status || filters.customer_id ? (
              <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {(filters.search ? 1 : 0) + (filters.status ? 1 : 0) + (filters.customer_id ? 1 : 0)}
              </span>
            ) : null}
          </button>
          {(filters.search || filters.status || filters.customer_id) && (
            <button
              onClick={() => setFilters({})}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Clear filters"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push("/rental/agreements/new")}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Rental</span>
        </button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search (Agreement #, Customer, Item)"
              value={filters.search || ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 min-w-[300px]"
            />
            <select
              value={filters.status || ""}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as "active" | "completed" | "returned" | "overdue" || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      )}

      <RentalAccountingStatusBanner />

      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      <RentalAgreementsTable
        agreements={agreements}
        loading={loading}
        onViewDetails={handleViewDetails}
      />

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
            onClose={handleCloseDetailModal}
            agreement={selectedAgreement}
            onRefresh={handleRefresh}
            onRecordPayment={handleRecordPayment}
            onReturnRental={handleReturnRental}
          />
          <RecordPaymentModal
            isOpen={showPaymentModal}
            onClose={handleClosePaymentModal}
            agreement={selectedAgreement}
            onPaymentRecorded={() => {
              handleClosePaymentModal();
              handleRefresh();
            }}
          />
          <ReturnRentalModal
            isOpen={showReturnModal}
            onClose={handleCloseReturnModal}
            agreement={selectedAgreement}
            onReturnProcessed={() => {
              handleCloseReturnModal();
              handleRefresh();
            }}
          />
        </>
      )}
    </div>
  );
}


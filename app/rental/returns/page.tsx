"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Eye } from "lucide-react";
import { useRentalAgreementsList, invalidateRentalAgreementsCache } from "../../components/Rentals/RentalAgreements/useRentalAgreementsList";
import RentalAgreementDetailModal from "../../components/Rentals/RentalAgreements/RentalAgreementDetailModal";
import type { RentalAgreement } from "../../lib/types";

export default function RentalReturnsPage() {
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

  // Filter to only show returned agreements
  const returnedAgreements = agreements.filter(a => a.rental_status === "returned");

  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Ensure filters show only returned items
  useEffect(() => {
    if (filters.status !== "returned") {
      setFilters({ status: "returned" });
    }
  }, [filters.status, setFilters]);

  const handleViewDetails = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
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

  const getReturnInfo = (agreement: RentalAgreement) => {
    // Since the API returns return info in the agreement, we need to check if there's a return record
    // For now, we'll show the agreement end date as return date
    return {
      returnDate: agreement.rental_end_date,
      condition: "returned_safely", // This would come from a return record in real implementation
      depositRefunded: agreement.security_deposit_amount, // This would come from return record
      damageCharges: 0, // This would come from return record
    };
  };

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

      {/* Returns Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && returnedAgreements.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading returned items...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Agreement Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rental Item</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Return Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Return Condition</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Security Deposit Refunded</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Damage Charges</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returnedAgreements.map((agreement) => {
              const returnInfo = getReturnInfo(agreement);
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
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {returnInfo.returnDate ? formatDate(returnInfo.returnDate) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      returnInfo.condition === "returned_safely" 
                        ? "bg-green-100 text-green-800"
                        : returnInfo.condition === "damaged"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {returnInfo.condition === "returned_safely" ? "Returned Safely" :
                       returnInfo.condition === "damaged" ? "Damaged" : "Lost"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-green-600 whitespace-nowrap">
                    {formatCurrency(returnInfo.depositRefunded)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 whitespace-nowrap">
                    {returnInfo.damageCharges > 0 ? formatCurrency(returnInfo.damageCharges) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleViewDetails(agreement)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && returnedAgreements.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No returned items found.
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
            Showing {returnedAgreements.length} returned agreement(s)
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
                Page {page} of {Math.ceil(total / perPage)}
              </span>
              <button
                type="button"
                disabled={page >= Math.ceil(total / perPage)}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedAgreement && (
        <RentalAgreementDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseModal}
          agreement={selectedAgreement}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}


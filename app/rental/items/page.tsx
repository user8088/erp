"use client";

import { useState } from "react";
import RentalItemsActionBar from "../../components/Rentals/RentalItems/RentalItemsActionBar";
import RentalItemsFilterBar from "../../components/Rentals/RentalItems/RentalItemsFilterBar";
import RentalItemsTable from "../../components/Rentals/RentalItems/RentalItemsTable";
import RentalItemsPagination from "../../components/Rentals/RentalItems/RentalItemsPagination";
import { useRentalItemsList } from "../../components/Rentals/RentalItems/useRentalItemsList";
import { rentalApi } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";

export default function RentalItemsPage() {
  const {
    items,
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
  } = useRentalItemsList();
  
  const { addToast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleRefresh = () => {
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rental item? This action cannot be undone.")) {
      return;
    }
    
    try {
      await rentalApi.deleteItem(id);
      addToast("Rental item deleted successfully.", "success");
      refresh();
    } catch (e: unknown) {
      console.error(e);
      
      // Handle specific error messages from backend
      if (e && typeof e === "object") {
        if ("data" in e) {
          const errorData = (e as { data: unknown }).data;
          if (errorData && typeof errorData === "object" && "error" in errorData) {
            const errorMessage = (errorData as { error: string }).error;
            addToast(errorMessage, "error");
            return;
          }
        }
      }
      
      addToast("Failed to delete rental item.", "error");
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <RentalItemsActionBar selectedCount={selectedRows.size} />
      <RentalItemsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}
      <RentalItemsTable
        items={items}
        loading={loading}
        onDelete={handleDelete}
        onSelectionChange={setSelectedRows}
      />
      <RentalItemsPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}


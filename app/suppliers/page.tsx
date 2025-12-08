"use client";

import { useState } from "react";
import SupplierActionBar from "../components/Suppliers/SupplierActionBar";
import SupplierFilterBar from "../components/Suppliers/SupplierFilterBar";
import SuppliersTable from "../components/Suppliers/SuppliersTable";
import SuppliersPagination from "../components/Suppliers/SuppliersPagination";
import { useSuppliersList } from "../components/Suppliers/useSuppliersList";
import { suppliersApi } from "../lib/apiClient";
import { useToast } from "../components/ui/ToastProvider";

export default function SuppliersPage() {
  const {
    suppliers,
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
  } = useSuppliersList();
  
  const { addToast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleRefresh = () => {
    refresh();
  };

  const handleDelete = async (id: number) => {
    try {
      await suppliersApi.deleteSupplier(id);
      addToast("Supplier deleted successfully.", "success");
      refresh();
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "error" in errorData) {
          const errorMessage = (errorData as { error: string }).error;
          addToast(errorMessage, "error");
          return;
        }
      }
      
      addToast("Failed to delete supplier.", "error");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const result = await suppliersApi.deleteSuppliers(ids);
      
      if (result.failed_ids && result.failed_ids.length > 0) {
        addToast(
          `${result.deleted_count} supplier(s) deleted. ${result.failed_ids.length} failed.`,
          "info"
        );
      } else {
        addToast(`${result.deleted_count} supplier(s) deleted successfully.`, "success");
      }
      
      refresh();
      setSelectedRows(new Set());
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
            return;
          }
        }
      }
      
      addToast("Failed to delete suppliers.", "error");
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <SupplierActionBar
        selectedCount={selectedRows.size}
        onBulkDelete={selectedRows.size > 0 ? () => handleBulkDelete(Array.from(selectedRows)) : undefined}
      />
      <SupplierFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}
      <SuppliersTable
        suppliers={suppliers}
        loading={loading}
        onDelete={handleDelete}
        onSelectionChange={setSelectedRows}
      />
      <SuppliersPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}

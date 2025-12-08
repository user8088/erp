"use client";

import { useState } from "react";
import ItemActionBar from "../components/Items/ItemActionBar";
import ItemFilterBar from "../components/Items/ItemFilterBar";
import ItemsTable from "../components/Items/ItemsTable";
import ItemsPagination from "../components/Items/ItemsPagination";
import { useItemsList } from "../components/Items/useItemsList";
import { itemsApi } from "../lib/apiClient";
import { useToast } from "../components/ui/ToastProvider";

export default function ItemsPage() {
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
  } = useItemsList();
  
  const { addToast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleRefresh = () => {
    refresh();
  };

  const handleDelete = async (id: number) => {
    try {
      await itemsApi.deleteItem(id);
      addToast("Item deleted successfully.", "success");
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
      
      addToast("Failed to delete item.", "error");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const result = await itemsApi.deleteItems(ids);
      
      // Show success message with details if some failed
      if (result.failed_ids && result.failed_ids.length > 0) {
        addToast(
          `${result.deleted_count} item(s) deleted. ${result.failed_ids.length} failed.`,
          "info"
        );
      } else {
        addToast(`${result.deleted_count} item(s) deleted successfully.`, "success");
      }
      
      refresh();
      setSelectedRows(new Set());
    } catch (e: unknown) {
      console.error(e);
      
      // Handle validation errors from backend
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
      
      addToast("Failed to delete items.", "error");
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <ItemActionBar
        selectedCount={selectedRows.size}
        onBulkDelete={selectedRows.size > 0 ? () => handleBulkDelete(Array.from(selectedRows)) : undefined}
      />
      <ItemFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}
      <ItemsTable
        items={items}
        loading={loading}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedRows}
      />
      <ItemsPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}

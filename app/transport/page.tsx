"use client";

import { useState } from "react";
import VehicleActionBar from "../components/Vehicles/VehicleActionBar";
import VehicleFilterBar from "../components/Vehicles/VehicleFilterBar";
import VehiclesTable from "../components/Vehicles/VehiclesTable";
import VehiclesPagination from "../components/Vehicles/VehiclesPagination";
import { useVehiclesList } from "../components/Vehicles/useVehiclesList";
import { vehiclesApi } from "../lib/apiClient";
import { useToast } from "../components/ui/ToastProvider";

export default function TransportPage() {
  const {
    vehicles,
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
  } = useVehiclesList();
  
  const { addToast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleRefresh = () => {
    refresh();
  };

  const handleDelete = async (id: number) => {
    try {
      await vehiclesApi.deleteVehicle(id);
      addToast("Vehicle deleted successfully.", "success");
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
      
      addToast("Failed to delete vehicle.", "error");
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <VehicleActionBar
        selectedCount={selectedRows.size}
        onBulkDelete={selectedRows.size > 0 ? () => {
          const ids = Array.from(selectedRows);
          Promise.all(ids.map(id => handleDelete(id)));
          setSelectedRows(new Set());
        } : undefined}
      />
      <VehicleFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
      />
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}
      <VehiclesTable
        vehicles={vehicles}
        loading={loading}
        onDelete={handleDelete}
        onBulkDelete={selectedRows.size > 0 ? () => {
          const ids = Array.from(selectedRows);
          Promise.all(ids.map(id => handleDelete(id)));
          setSelectedRows(new Set());
        } : undefined}
        onSelectionChange={setSelectedRows}
      />
      <VehiclesPagination
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}


"use client";

import { Filter, X, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { GetVehiclesParams } from "../../lib/apiClient";

interface VehicleFilterBarProps {
  filters: GetVehiclesParams;
  onFiltersChange: (filters: GetVehiclesParams) => void;
  onRefresh?: () => void;
}

export default function VehicleFilterBar({ filters, onFiltersChange, onRefresh }: VehicleFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const activeFiltersCount = [
    localSearch,
    filters.status,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setLocalSearch("");
    onFiltersChange({});
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onFiltersChange({
      ...filters,
      search: value || undefined,
    });
  };

  return (
    <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
      {/* Top Row: Filters Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Clear filters"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Inputs */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by name, registration number, or type"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
          <select
            value={filters.status || ""}
            onChange={(e) => {
              const value = e.target.value;
              onFiltersChange({ ...filters, status: value === "" ? undefined : (value as "active" | "inactive") });
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
    </div>
  );
}


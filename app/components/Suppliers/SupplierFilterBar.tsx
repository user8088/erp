"use client";

import { useState, useMemo } from "react";
import { Search, Filter, X, RefreshCw } from "lucide-react";
import type { SuppliersFilters } from "./useSuppliersList";

interface SupplierFilterBarProps {
  filters: SuppliersFilters;
  onFiltersChange: (filters: SuppliersFilters) => void;
  onRefresh: () => void;
}

export default function SupplierFilterBar({ filters, onFiltersChange, onRefresh }: SupplierFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState({
    serial: "",
    name: "",
    phone: "",
    email: "",
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.rating_filter) count++;
    return count;
  }, [filters]);

  const handleSearchChange = (field: keyof typeof localSearch, value: string) => {
    const newLocalSearch = { ...localSearch, [field]: value };
    setLocalSearch(newLocalSearch);

    // Combine all search fields into one
    const combinedSearch = Object.values(newLocalSearch)
      .filter((v) => v.trim())
      .join(" ");
    
    onFiltersChange({ ...filters, search: combinedSearch });
  };

  const handleFilterChange = (key: keyof SuppliersFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleClearFilters = () => {
    setLocalSearch({ serial: "", name: "", phone: "", email: "" });
    onFiltersChange({
      search: "",
      status: undefined,
      rating_filter: undefined,
    });
    setShowFilters(false);
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by serial number..."
              value={localSearch.serial}
              onChange={(e) => handleSearchChange("serial", e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={localSearch.name}
              onChange={(e) => handleSearchChange("name", e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone..."
              value={localSearch.phone}
              onChange={(e) => handleSearchChange("phone", e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email..."
              value={localSearch.email}
              onChange={(e) => handleSearchChange("email", e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors border border-gray-300"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Filter Suppliers</h3>
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <select
                value={filters.rating_filter || ""}
                onChange={(e) => handleFilterChange("rating_filter", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Ratings</option>
                <option value="9-10">9-10 (Excellent)</option>
                <option value="7-8">7-8 (Good)</option>
                <option value="5-6">5-6 (Average)</option>
                <option value="1-4">1-4 (Poor)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

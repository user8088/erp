"use client";

import { Filter, X, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { GetCustomersParams } from "../../lib/apiClient";

interface CustomerFilterBarProps {
  filters: GetCustomersParams;
  onFiltersChange: (filters: GetCustomersParams) => void;
  onRefresh?: () => void;
}

export default function CustomerFilterBar({ filters, onFiltersChange, onRefresh }: CustomerFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState({
    serial: "",
    name: "",
    phone: "",
    email: "",
  });
  
  const activeFiltersCount = [
    localSearch.serial || localSearch.name || localSearch.phone || localSearch.email,
    filters.status,
    filters.rating_filter,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setLocalSearch({ serial: "", name: "", phone: "", email: "" });
    onFiltersChange({});
  };

  const handleSearchChange = (field: keyof typeof localSearch, value: string) => {
    const newLocalSearch = { ...localSearch, [field]: value };
    setLocalSearch(newLocalSearch);
    
    // Combine all search fields into one search string
    const searchParts = [
      newLocalSearch.serial,
      newLocalSearch.name,
      newLocalSearch.phone,
      newLocalSearch.email,
    ].filter(Boolean);
    
    onFiltersChange({
      ...filters,
      search: searchParts.length > 0 ? searchParts.join(" ") : undefined,
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
            placeholder="Serial #"
            value={localSearch.serial}
            onChange={(e) => handleSearchChange("serial", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
          <input
            type="text"
            placeholder="Name"
            value={localSearch.name}
            onChange={(e) => handleSearchChange("name", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={localSearch.phone}
            onChange={(e) => handleSearchChange("phone", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
          <input
            type="text"
            placeholder="Email"
            value={localSearch.email}
            onChange={(e) => handleSearchChange("email", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
          <select
            value={filters.status || ""}
            onChange={(e) => {
              const value = e.target.value;
              onFiltersChange({ ...filters, status: value === "" ? undefined : (value as "clear" | "has_dues") });
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="clear">Clear</option>
            <option value="has_dues">Has Dues</option>
          </select>
          <select
            value={filters.rating_filter || ""}
            onChange={(e) => onFiltersChange({ ...filters, rating_filter: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">All Ratings</option>
            <option value="8+">8+ Stars</option>
            <option value="5-7">5-7 Stars</option>
            <option value="below5">Below 5 Stars</option>
          </select>
        </div>
      )}
    </div>
  );
}

"use client";

import { Filter, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import type { GetItemsParams } from "../../lib/apiClient";
import { categoriesApi } from "../../lib/apiClient";
import type { Category } from "../../lib/types";

interface ItemFilterBarProps {
  filters: GetItemsParams;
  onFiltersChange: (filters: GetItemsParams) => void;
  onRefresh?: () => void;
}

export default function ItemFilterBar({ filters, onFiltersChange, onRefresh }: ItemFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoriesApi.getCategories({ per_page: 100 });
        setCategories(data.data);
      } catch (e) {
        console.error("Failed to load categories:", e);
      }
    };
    void loadCategories();
  }, []);
  
  const activeFiltersCount = [
    filters.search,
    filters.category_id,
    filters.brand,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({});
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
            placeholder="Search (Serial #, Name, Brand)"
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 min-w-[300px]"
          />
          <select
            value={filters.category_id || ""}
            onChange={(e) => {
              const value = e.target.value;
              onFiltersChange({ ...filters, category_id: value === "" ? undefined : Number(value) });
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Brand"
            value={filters.brand || ""}
            onChange={(e) => onFiltersChange({ ...filters, brand: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
          />
        </div>
      )}
    </div>
  );
}

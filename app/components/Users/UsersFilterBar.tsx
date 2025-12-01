"use client";

import { Filter, X, ArrowUpDown, Heart } from "lucide-react";
import { useState } from "react";

export default function UsersFilterBar() {
  const [filters, setFilters] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
      {/* Top Row: Filters, Sort, Pagination */}
      <div className="flex items-center justify-end gap-2">
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {filters > 0 && (
              <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {filters}
              </span>
            )}
          </button>
          {filters > 0 && (
            <button
              onClick={() => setFilters(0)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Clear filters"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700">
          <ArrowUpDown className="w-4 h-4" />
          <span>Last Updated On</span>
        </button>
        <div className="text-sm text-gray-600 px-2">1 of 1</div>
        <button
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Favorite"
        >
          <Heart className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Bottom Row: Search Inputs */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="ID"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
        <input
          type="text"
          placeholder="Full Name"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
        <input
          type="text"
          placeholder="Username"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
        <input
          type="text"
          placeholder="User Type"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
      </div>
    </div>
  );
}


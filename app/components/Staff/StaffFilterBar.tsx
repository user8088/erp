"use client";

import { Filter, X, ArrowUpDown, Search } from "lucide-react";
import { useState } from "react";

export default function StaffFilterBar() {
  const [filters, setFilters] = useState(3);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="mb-4 pb-4 border-b border-gray-200 space-y-3">
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
          <span>Next Pay Date</span>
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-600">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search name, code, phone"
            className="bg-transparent focus:outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="Department"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
        <input
          type="text"
          placeholder="Designation"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
        <input
          type="text"
          placeholder="Status"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Employment Type
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {["Full Time", "Part Time", "Contract"].map((option) => (
                  <button
                    key={option}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-100"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Payroll Cycle
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {["Monthly", "Weekly", "Daily"].map((option) => (
                  <button
                    key={option}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-100"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                ERP User Mapping
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {["ERP Users", "Not Mapped"].map((option) => (
                  <button
                    key={option}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-100"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Calendar, Download, FileText, Printer } from "lucide-react";
import type { ReportFilters as ReportFiltersType, ComparisonType } from "../../lib/types";

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
  onExport?: (format: "pdf" | "excel" | "csv") => void;
  onPrint?: () => void;
  showComparison?: boolean;
  loading?: boolean;
}

export default function ReportFilters({
  filters,
  onFiltersChange,
  onExport,
  onPrint,
  showComparison = true,
  loading = false,
}: ReportFiltersProps) {
  const [showComparisonOptions, setShowComparisonOptions] = useState(
    filters.comparison_type !== "none"
  );

  const handleDateChange = (field: "start_date" | "end_date", value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const handleComparisonChange = (type: ComparisonType) => {
    if (type === "none") {
      onFiltersChange({
        ...filters,
        comparison_type: "none",
        comparison_start_date: undefined,
        comparison_end_date: undefined,
      });
      setShowComparisonOptions(false);
    } else {
      onFiltersChange({
        ...filters,
        comparison_type: type,
      });
      setShowComparisonOptions(true);
    }
  };

  const handleComparisonDateChange = (
    field: "comparison_start_date" | "comparison_end_date",
    value: string
  ) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  // Calculate comparison dates based on type
  const calculateComparisonDates = (type: ComparisonType) => {
    if (type === "previous_period") {
      const start = new Date(filters.start_date);
      const end = new Date(filters.end_date);
      const diff = end.getTime() - start.getTime();
      const compEnd = new Date(start.getTime() - 1);
      const compStart = new Date(compEnd.getTime() - diff);
      return {
        comparison_start_date: compStart.toISOString().split("T")[0],
        comparison_end_date: compEnd.toISOString().split("T")[0],
      };
    } else if (type === "previous_year") {
      const start = new Date(filters.start_date);
      const end = new Date(filters.end_date);
      start.setFullYear(start.getFullYear() - 1);
      end.setFullYear(end.getFullYear() - 1);
      return {
        comparison_start_date: start.toISOString().split("T")[0],
        comparison_end_date: end.toISOString().split("T")[0],
      };
    }
    return {};
  };

  const applyQuickPeriod = (period: "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year") => {
    const today = new Date();
    let start: Date, end: Date;

    switch (period) {
      case "this_month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "last_month":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this_quarter":
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case "last_quarter":
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        start = new Date(lastQuarterYear, lastQuarterMonth, 1);
        end = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        break;
      case "this_year":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case "last_year":
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
    }

    const newFilters = {
      ...filters,
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };

    if (filters.comparison_type && filters.comparison_type !== "none") {
      const compDates = calculateComparisonDates(filters.comparison_type);
      Object.assign(newFilters, compDates);
    }

    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleDateChange("start_date", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
              disabled={loading}
            />
            <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleDateChange("end_date", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
              disabled={loading}
            />
            <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Quick Period Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quick Period
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                applyQuickPeriod(e.target.value as any);
                e.target.value = "";
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
            disabled={loading}
          >
            <option value="">Select period...</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
          </select>
        </div>

        {/* Comparison Type */}
        {showComparison && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compare With
            </label>
            <select
              value={filters.comparison_type || "none"}
              onChange={(e) => handleComparisonChange(e.target.value as ComparisonType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
              disabled={loading}
            >
              <option value="none">No Comparison</option>
              <option value="previous_period">Previous Period</option>
              <option value="previous_year">Previous Year</option>
            </select>
          </div>
        )}
      </div>

      {/* Comparison Dates (if enabled) */}
      {showComparison && showComparisonOptions && filters.comparison_type !== "none" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comparison Start Date
            </label>
            <input
              type="date"
              value={filters.comparison_start_date || ""}
              onChange={(e) => handleComparisonDateChange("comparison_start_date", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comparison End Date
            </label>
            <input
              type="date"
              value={filters.comparison_end_date || ""}
              onChange={(e) => handleComparisonDateChange("comparison_end_date", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {onExport && (
            <>
              <button
                onClick={() => onExport("pdf")}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => onExport("excel")}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={() => onExport("csv")}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </>
          )}
        </div>
        {onPrint && (
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        )}
      </div>
    </div>
  );
}


"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface SuppliersPaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export default function SuppliersPagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: SuppliersPaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, total);

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          Showing {startItem}-{endItem} of {total} suppliers
        </span>
        <span className="text-gray-400">|</span>
        <label className="inline-flex items-center gap-2">
          <span>Per page:</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

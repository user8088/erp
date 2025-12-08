"use client";

interface CustomersPaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export default function CustomersPagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: CustomersPaginationProps) {
  const lastPage = Math.ceil(total / perPage);
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  if (total === 0) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Showing {start} to {end} of {total} customers
      </div>
      <div className="flex items-center gap-3">
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
          >
            Previous
          </button>
          <span className="px-3 text-sm text-gray-600">
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

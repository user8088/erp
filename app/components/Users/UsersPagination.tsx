"use client";

interface UsersPaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

const options = [20, 100, 500, 2500];

export default function UsersPagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: UsersPaginationProps) {
  const lastPage = total > 0 ? Math.ceil(total / perPage) : 1;

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Items per page:</span>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onPerPageChange(option)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              perPage === option
                ? "bg-orange-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button
          className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span>
          Page {page} of {lastPage}
        </span>
        <button
          className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
          onClick={() => onPageChange(Math.min(lastPage, page + 1))}
          disabled={page >= lastPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}


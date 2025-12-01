"use client";

import { useState } from "react";

export default function UsersPagination() {
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const itemsPerPageOptions = [20, 100, 500, 2500];

  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-sm text-gray-600">Items per page:</span>
      {itemsPerPageOptions.map((option) => (
        <button
          key={option}
          onClick={() => setItemsPerPage(option)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            itemsPerPage === option
              ? "bg-orange-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}


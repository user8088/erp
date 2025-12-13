"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface RentalItemsActionBarProps {
  selectedCount?: number;
  onBulkDelete?: () => void;
}

export default function RentalItemsActionBar({
  selectedCount = 0,
  onBulkDelete,
}: RentalItemsActionBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {selectedCount > 0 && onBulkDelete && (
          <button
            type="button"
            onClick={onBulkDelete}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Delete {selectedCount} Selected
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => router.push("/rental/items/new")}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add Rental Item</span>
      </button>
    </div>
  );
}


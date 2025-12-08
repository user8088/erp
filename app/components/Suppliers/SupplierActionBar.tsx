"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SupplierActionBarProps {
  selectedCount: number;
  onBulkDelete?: () => void;
}

export default function SupplierActionBar({ selectedCount, onBulkDelete }: SupplierActionBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {selectedCount > 0 && onBulkDelete && (
          <button
            onClick={onBulkDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selectedCount} Selected
          </button>
        )}
      </div>

      <button
        onClick={() => router.push("/suppliers/new")}
        className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Supplier
      </button>
    </div>
  );
}

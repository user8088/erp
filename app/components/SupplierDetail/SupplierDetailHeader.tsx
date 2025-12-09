"use client";

import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Printer,
  MoreVertical,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Supplier } from "../../lib/types";

interface SupplierDetailHeaderProps {
  supplierId: string;
  supplier?: Supplier | null;
  onSave?: () => void;
  saving?: boolean;
}

export default function SupplierDetailHeader({
  supplier,
  onSave,
  saving,
}: SupplierDetailHeaderProps) {
  const router = useRouter();

  const displayName = supplier?.name || "Supplier";
  const statusLabel = supplier?.status === "active" ? "Active" : "Inactive";
  const statusColor = supplier?.status === "active" 
    ? "bg-green-100 text-green-800" 
    : "bg-gray-100 text-gray-800";

  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Back"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{displayName}</h1>
        {supplier && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border border-gray-300 rounded-md">
          <button className="p-2 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          <Printer className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        <button
          type="button"
          onClick={() => onSave?.()}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save"}</span>
        </button>
      </div>
    </div>
  );
}

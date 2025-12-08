"use client";

import { ArrowLeft, Save, Printer, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Supplier } from "../../lib/types";

interface SupplierDetailHeaderProps {
  supplier: Supplier;
}

export default function SupplierDetailHeader({ supplier }: SupplierDetailHeaderProps) {
  const router = useRouter();

  const getStatusBadge = (status: Supplier['status']) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        Inactive
      </span>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/suppliers")}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{supplier.name}</h1>
                {getStatusBadge(supplier.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {supplier.serial_number}
                </span>
                {supplier.customer && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Also Customer: {supplier.customer.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Save"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

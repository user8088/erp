"use client";

import { Paperclip, Tag, Truck } from "lucide-react";
import { Plus } from "lucide-react";
import type { Vehicle } from "../../lib/types";

interface VehicleDetailSidebarProps {
  vehicle: Vehicle | null;
}

export default function VehicleDetailSidebar({ vehicle }: VehicleDetailSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="relative w-32 h-32 mx-auto">
        <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
          <Truck className="w-16 h-16 text-white" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {/* Attachments */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Attachments</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p className="mt-1 ml-6 text-xs text-gray-400">No documents attached yet.</p>
        </div>

        {/* Tags */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Tags</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Last edited · {vehicle ? new Date(vehicle.updated_at).toLocaleDateString() : "—"}</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Created · {vehicle ? new Date(vehicle.created_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </div>
  );
}


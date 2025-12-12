"use client";

import {
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  MoreVertical,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StaffMember } from "../../lib/types";

interface StaffDetailHeaderProps {
  staff: StaffMember;
  onToggleSidebar?: () => void;
  onSave?: () => void;
  saving?: boolean;
}

export default function StaffDetailHeader({
  staff,
  onToggleSidebar,
  onSave,
  saving,
}: StaffDetailHeaderProps) {
  const router = useRouter();
  const [isRolesMenuOpen, setIsRolesMenuOpen] = useState(false);

  const statusLabel =
    staff.status === "active"
      ? "Active"
      : staff.status === "on_leave"
      ? "On Leave"
      : "Inactive";
  const statusColor =
    staff.status === "active"
      ? "bg-green-100 text-green-800"
      : staff.status === "on_leave"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (onToggleSidebar) {
              onToggleSidebar();
            } else {
              router.back();
            }
          }}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Back"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">
              {staff.full_name}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {staff.designation} {staff.department ? `• ${staff.department}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRolesMenuOpen((open) => !open)}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
          >
            <span>Roles</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {isRolesMenuOpen && (
            <div className="absolute z-20 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1">
              <button
                type="button"
                onClick={() => setIsRolesMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Assign Role
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRolesMenuOpen(false);
                  router.push("/staff/roles");
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Manage Roles
              </button>
            </div>
          )}
        </div>
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


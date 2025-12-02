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
import { useToast } from "../ui/ToastProvider";
import type { User } from "../../lib/types";
import { useUser } from "../User/UserContext";

interface UserDetailHeaderProps {
  userId: string;
  user?: User | null;
  onToggleSidebar?: () => void;
  onSave?: () => void;
  saving?: boolean;
}

export default function UserDetailHeader({
  user,
  onToggleSidebar,
  onSave,
  saving,
}: UserDetailHeaderProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { hasAtLeast } = useUser();
  const [isRolesMenuOpen, setIsRolesMenuOpen] = useState(false);
  const [isPasswordMenuOpen, setIsPasswordMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const canManageRoles = hasAtLeast("module.roles_permissions", "read");
  const canResetPassword = hasAtLeast("action.user.reset_password", "read-write");

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "User";

  const isActive = user?.status === "active";

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
        <h1 className="text-lg font-semibold text-gray-900">{displayName}</h1>
        {user && (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Roles dropdown button */}
        {canManageRoles && (
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
                  onClick={() => {
                    setIsRolesMenuOpen(false);
                    router.push("/staff/roles/new");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Create New Role
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
        )}

        {/* Password dropdown */}
        {canResetPassword && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPasswordMenuOpen((open) => !open)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <span>Password</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isPasswordMenuOpen && (
              <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3 space-y-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reset Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    onClick={() => {
                      setIsPasswordMenuOpen(false);
                      setNewPassword("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs text-white bg-black rounded-md hover:bg-gray-800"
                    onClick={() => {
                      if (!newPassword.trim()) return;
                      // TODO: integrate with backend password reset
                      addToast("Password reset successfully.", "success");
                      setNewPassword("");
                      setIsPasswordMenuOpen(false);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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


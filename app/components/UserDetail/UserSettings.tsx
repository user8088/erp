"use client";

import { useEffect, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/ToastProvider";
import { apiClient } from "../../lib/apiClient";

interface UserSettingsProps {
  userId: string;
  status?: "active" | "inactive";
  onStatusChange: (status: "active" | "inactive") => void;
}

export default function UserSettings({
  userId,
  status,
  onStatusChange,
}: UserSettingsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isInactive, setIsInactive] = useState(status === "inactive");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setIsInactive(status === "inactive");
  }, [status]);

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/users/${userId}`);
      addToast("User profile deleted.", "success");
      router.push("/staff/users");
    } catch (e: any) {
      console.error(e);
      addToast(e?.message ?? "Failed to delete user.", "error");
    }
  };

  const handleMarkInactive = async (checked: boolean) => {
    const newStatus: "active" | "inactive" = checked ? "inactive" : "active";
    setIsInactive(checked);
    try {
      await apiClient.patch(`/users/${userId}/status`, {
        status: newStatus,
      });
      onStatusChange(newStatus);
      addToast(
        checked ? "User marked as inactive." : "User marked as active.",
        "info"
      );
    } catch (e: any) {
      console.error(e);
      setIsInactive(status === "inactive");
      addToast(e?.message ?? "Failed to update status.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Mark as Inactive */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Status</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isInactive}
            onChange={(e) => handleMarkInactive(e.target.checked)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Mark as Inactive</span>
            <p className="text-xs text-gray-500 mt-1">
              Inactive users cannot log in to the system
            </p>
          </div>
        </label>
      </div>

      {/* Delete Profile */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Profile</h3>
            <p className="text-xs text-gray-500 mb-4">
              Once you delete a profile, there is no going back. Please be certain.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Profile</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 font-medium">
                  Are you sure you want to delete this profile? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


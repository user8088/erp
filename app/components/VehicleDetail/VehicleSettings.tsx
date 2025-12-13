"use client";

import { useState, useEffect } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/ToastProvider";
import { vehiclesApi } from "../../lib/apiClient";

interface VehicleSettingsProps {
  vehicleId: string;
  status?: "active" | "inactive";
  onStatusChange: (status: "active" | "inactive") => void;
  onVehicleDeleted: () => void;
}

export default function VehicleSettings({
  vehicleId,
  status,
  onStatusChange,
  onVehicleDeleted,
}: VehicleSettingsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isInactive, setIsInactive] = useState(status === "inactive");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setIsInactive(status === "inactive");
  }, [status]);

  const handleDelete = async () => {
    try {
      await vehiclesApi.deleteVehicle(Number(vehicleId));
      addToast("Vehicle deleted successfully.", "success");
      onVehicleDeleted();
    } catch (e: unknown) {
      console.error(e);
      
      // Handle specific error messages from backend
      if (e && typeof e === "object") {
        if ("data" in e) {
          const errorData = (e as { data: unknown }).data;
          if (errorData && typeof errorData === "object" && "error" in errorData) {
            const errorMessage = (errorData as { error: string }).error;
            addToast(errorMessage, "error");
            return;
          }
        }
      }
      
      addToast("Failed to delete vehicle.", "error");
    }
  };

  const handleMarkInactive = async (checked: boolean) => {
    const newStatus: "active" | "inactive" = checked ? "inactive" : "active";
    setIsInactive(checked);
    try {
      await vehiclesApi.updateVehicle(Number(vehicleId), {
        status: newStatus,
      });
      onStatusChange(newStatus);
      addToast(
        checked ? "Vehicle marked as inactive." : "Vehicle marked as active.",
        "info"
      );
    } catch (e) {
      console.error(e);
      setIsInactive(status === "inactive");
      addToast("Failed to update status.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Mark as Inactive */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Vehicle Status</h3>
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
              Inactive vehicles will not appear in selection lists for new deliveries
            </p>
          </div>
        </label>
      </div>

      {/* Delete Vehicle */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Vehicle</h3>
            <p className="text-xs text-gray-500 mb-4">
              Once you delete a vehicle, there is no going back. If the vehicle has completed sales, it will be soft-deleted to maintain historical data.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Vehicle</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 font-medium">
                  Are you sure you want to delete this vehicle? This action cannot be undone.
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


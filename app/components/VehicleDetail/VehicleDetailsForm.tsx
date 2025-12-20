"use client";

import { useState, useEffect } from "react";
import type { Vehicle } from "../../lib/types";
import { vehiclesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import { invalidateVehiclesCache } from "../Vehicles/useVehiclesList";

interface VehicleDetailsFormProps {
  vehicleId: string;
  vehicle: Vehicle | null;
  onVehicleUpdated: (vehicle: Vehicle) => void;
  externalSaveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function VehicleDetailsForm({
  vehicleId,
  vehicle,
  onVehicleUpdated,
  externalSaveSignal,
  onSavingChange,
}: VehicleDetailsFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    registration_number: "",
    type: "",
    notes: "",
    status: "active" as "active" | "inactive",
    maintenance_cost: "",
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name,
        registration_number: vehicle.registration_number,
        type: vehicle.type || "",
        notes: vehicle.notes || "",
        status: vehicle.status,
        maintenance_cost: vehicle.maintenance_cost?.toString() || "",
      });
    }
  }, [vehicle]);

  useEffect(() => {
    if (externalSaveSignal) {
      handleSave();
    }
  }, [externalSaveSignal]);

  const handleSave = async () => {
    if (!vehicle) return;
    onSavingChange?.(true);
    try {
      const payload = {
        name: formData.name,
        registration_number: formData.registration_number,
        type: formData.type || null,
        notes: formData.notes || null,
        status: formData.status,
        maintenance_cost: formData.maintenance_cost ? Number(formData.maintenance_cost) : undefined,
      };
      const res = await vehiclesApi.updateVehicle(Number(vehicleId), payload);
      onVehicleUpdated(res.vehicle);
      
      invalidateVehiclesCache();
      
      addToast("Vehicle updated successfully.", "success");
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
          } else {
            addToast("Failed to update vehicle.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to update vehicle.", "error");
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Basic Information</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="e.g., truck, van, car"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Cost Per Delivery <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.maintenance_cost}
              onChange={(e) => setFormData({ ...formData, maintenance_cost: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., 300 (fuel cost per delivery)"
            />
            <p className="text-xs text-gray-500 mt-1">
              This cost will be automatically applied to all delivery orders for this vehicle and included in profitability calculations.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Optional notes about the vehicle..."
          />
        </div>
      </div>
    </div>
  );
}


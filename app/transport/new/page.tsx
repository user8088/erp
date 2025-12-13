"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { vehiclesApi, type CreateOrUpdateVehiclePayload } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import { invalidateVehiclesCache } from "../../components/Vehicles/useVehiclesList";

export default function NewVehiclePage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    registration_number: "",
    type: "",
    notes: "",
    status: "active" as "active" | "inactive",
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error for this field when user types
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    const localErrors: Record<string, string[]> = {};
    if (!formData.name.trim()) localErrors.name = ["Vehicle name is required."];
    if (!formData.registration_number.trim()) localErrors.registration_number = ["Registration number is required."];

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: CreateOrUpdateVehiclePayload = {
        name: formData.name.trim(),
        registration_number: formData.registration_number.trim(),
        type: formData.type.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
      };

      const response = await vehiclesApi.createVehicle(payload);
      addToast("Vehicle created successfully.", "success");
      
      // Invalidate cache to show fresh data when navigating back
      invalidateVehiclesCache();
      
      router.push(`/transport/${response.vehicle.id}`);
    } catch (e: unknown) {
      console.error(e);
      
      // Handle validation errors from backend
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          setErrors(backendErrors);
          
          // Show the first error message in toast
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
          } else {
            addToast("Failed to create vehicle.", "error");
          }
          return;
        }
        if (errorData && typeof errorData === "object" && "error" in errorData) {
          const errorMessage = (errorData as { error: string }).error;
          addToast(errorMessage, "error");
          return;
        }
      }
      
      addToast("Failed to create vehicle.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full py-8">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">New Vehicle</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        {/* Vehicle Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <Truck className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehicle Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleChange("name")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Truck-001"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Registration Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.registration_number}
              onChange={handleChange("registration_number")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., ABC-123"
            />
            {errors.registration_number && (
              <p className="mt-1 text-xs text-red-600">{errors.registration_number[0]}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={handleChange("type")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., truck, van, car"
            />
            {errors.type && (
              <p className="mt-1 text-xs text-red-600">{errors.type[0]}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={handleChange("status")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Notes - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={handleChange("notes")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Optional notes about the vehicle"
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-red-600">{errors.notes[0]}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


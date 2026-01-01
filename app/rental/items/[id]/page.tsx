"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { rentalApi, type CreateOrUpdateRentalItemPayload } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";
import { invalidateRentalItemsCache } from "../../../components/Rentals/RentalItems/useRentalItemsList";
import type { RentalCategory, RentalItem } from "../../../lib/types";

export default function RentalItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();

  const [item, setItem] = useState<RentalItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    rental_category_id: "",
    name: "",
    sku: "",
    quantity_total: "",
    quantity_available: "",
    cost_price: "",
    security_deposit_amount: "",
    status: "available" as "available" | "rented" | "maintenance",
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<RentalCategory[]>([]);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const res = await rentalApi.getItem(Number(id));
        setItem(res.item);
        setFormData({
          rental_category_id: String(res.item.rental_category_id),
          name: res.item.name,
          sku: res.item.sku,
          quantity_total: String(res.item.quantity_total),
          quantity_available: String(res.item.quantity_available),
          cost_price: res.item.cost_price ? String(res.item.cost_price) : "",
          security_deposit_amount: res.item.security_deposit_amount ? String(res.item.security_deposit_amount) : "",
          status: res.item.status,
        });
      } catch (e) {
        console.error("Failed to load rental item:", e);
        addToast("Failed to load rental item.", "error");
      } finally {
        setLoading(false);
      }
    };
    void loadItem();

    const loadCategories = async () => {
      try {
        const data = await rentalApi.getCategories({ per_page: 100 });
        setCategories(data.data);
      } catch (e) {
        console.error("Failed to load rental categories:", e);
      }
    };
    void loadCategories();
  }, [id, addToast]);


  const handleChange = (
    field: keyof typeof formData
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    const localErrors: Record<string, string[]> = {};
    if (!formData.name.trim()) localErrors.name = ["Item name is required."];
    if (!formData.rental_category_id) localErrors.rental_category_id = ["Category is required."];
    if (!formData.quantity_total || parseFloat(formData.quantity_total) < 1) {
      localErrors.quantity_total = ["Total quantity must be at least 1."];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<CreateOrUpdateRentalItemPayload> = {
        rental_category_id: Number(formData.rental_category_id),
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        quantity_total: parseFloat(formData.quantity_total),
        quantity_available: formData.quantity_available ? parseFloat(formData.quantity_available) : undefined,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        security_deposit_amount: formData.security_deposit_amount ? parseFloat(formData.security_deposit_amount) : undefined,
        status: formData.status,
      };

      await rentalApi.updateItem(Number(id), payload);
      addToast("Rental item updated successfully.", "success");
      
      invalidateRentalItemsCache();
      
      router.push("/rental/items");
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          setErrors(backendErrors);
          
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
          } else {
            addToast("Failed to update rental item.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to update rental item.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto min-h-full py-8">
        <div className="text-sm text-gray-500">Loading rental item...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto min-h-full py-8">
        <div className="text-sm text-red-600">Rental item not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto min-h-full py-8">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Edit Rental Item</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleChange("name")}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.rental_category_id}
              onChange={handleChange("rental_category_id")}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.rental_category_id ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.rental_category_id && (
              <p className="mt-1 text-sm text-red-600">{errors.rental_category_id[0]}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Code / SKU
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={handleChange("sku")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Total Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              min="1"
              value={formData.quantity_total}
              onChange={handleChange("quantity_total")}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.quantity_total ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.quantity_total && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity_total[0]}</p>
            )}
          </div>

          {/* Available Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Quantity
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={formData.quantity_available}
              onChange={handleChange("quantity_available")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price (Asset)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price}
              onChange={handleChange("cost_price")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500">
              Original purchase cost - treated as asset in accounting
            </p>
          </div>

          {/* Security Deposit Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Security Deposit Amount (per unit)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.security_deposit_amount}
              onChange={handleChange("security_deposit_amount")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500">
              Default security deposit amount per unit (optional)
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={handleChange("status")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}


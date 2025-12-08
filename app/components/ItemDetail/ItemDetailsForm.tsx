"use client";

import { useState, useEffect } from "react";
import type { Item, Category } from "../../lib/types";
import { itemsApi, categoriesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import { invalidateItemsCache } from "../Items/useItemsList";

interface ItemDetailsFormProps {
  itemId: string;
  item: Item | null;
  onItemUpdated: (item: Item) => void;
  externalSaveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function ItemDetailsForm({
  itemId,
  item,
  onItemUpdated,
  externalSaveSignal,
  onSavingChange,
}: ItemDetailsFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category_id: "",
    last_purchase_price: "",
    lowest_purchase_price: "",
    highest_purchase_price: "",
    selling_price: "",
    primary_unit: "",
    secondary_unit: "",
    conversion_rate: "",
  });
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoriesApi.getCategories({ per_page: 100 });
        setCategories(data.data);
      } catch (e) {
        console.error("Failed to load categories:", e);
      }
    };
    void loadCategories();
  }, []);

  useEffect(() => {
    if (item) {
      console.log("[ItemDetailsForm] Received item data:", {
        id: item.id,
        name: item.name,
        primary_unit: item.primary_unit,
        secondary_unit: item.secondary_unit,
        conversion_rate: item.conversion_rate,
      });
      
      setFormData({
        name: item.name,
        brand: item.brand || "",
        category_id: item.category_id ? String(item.category_id) : "",
        last_purchase_price: item.last_purchase_price !== null ? String(item.last_purchase_price) : "",
        lowest_purchase_price: item.lowest_purchase_price !== null ? String(item.lowest_purchase_price) : "",
        highest_purchase_price: item.highest_purchase_price !== null ? String(item.highest_purchase_price) : "",
        selling_price: item.selling_price !== null ? String(item.selling_price) : "",
        primary_unit: item.primary_unit || "",
        secondary_unit: item.secondary_unit || "",
        conversion_rate: item.conversion_rate !== null ? String(item.conversion_rate) : "",
      });
    }
  }, [item]);

  useEffect(() => {
    if (externalSaveSignal) {
      handleSave();
    }
  }, [externalSaveSignal]);

  const handleSave = async () => {
    if (!item) return;
    
    // Validate required fields
    if (!formData.name.trim()) {
      addToast("Item name is required.", "error");
      return;
    }
    if (!formData.primary_unit.trim()) {
      addToast("Primary unit is required.", "error");
      return;
    }
    
    // Validate that if secondary_unit is set, conversion_rate should be set too
    if (formData.secondary_unit && !formData.conversion_rate) {
      addToast("Please set the conversion rate for the secondary unit.", "error");
      return;
    }
    
    onSavingChange?.(true);
    try {
      const payload = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || null,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        picture_url: item.picture_url || null,
        last_purchase_price: formData.last_purchase_price ? Number(formData.last_purchase_price) : null,
        lowest_purchase_price: formData.lowest_purchase_price ? Number(formData.lowest_purchase_price) : null,
        highest_purchase_price: formData.highest_purchase_price ? Number(formData.highest_purchase_price) : null,
        selling_price: formData.selling_price ? Number(formData.selling_price) : null,
        primary_unit: formData.primary_unit.trim(),
        secondary_unit: formData.secondary_unit.trim() || null,
        conversion_rate: formData.conversion_rate ? Number(formData.conversion_rate) : null,
      };
      
      const res = await itemsApi.updateItem(Number(itemId), payload);
      onItemUpdated(res.item);
      
      // Invalidate cache to show fresh data when navigating back
      invalidateItemsCache();
      
      addToast("Item updated successfully.", "success");
    } catch (e: unknown) {
      console.error(e);
      
      // Handle validation errors from backend
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          
          // Show the first error message in toast
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
          } else {
            addToast("Failed to update item.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to update item.", "error");
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
      
      {/* Alert if critical fields are missing */}
      {item && !item.primary_unit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <span className="font-semibold">⚠️ Missing Unit Information:</span> Please fill in the primary unit field below. This is required for stock tracking and sales.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Serial Number - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serial Number
          </label>
          <input
            type="text"
            value={item?.serial_number || ""}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          {item?.category?.alias && (
            <p className="mt-1 text-xs text-gray-500">
              Prefix from category: {item.category.name} ({item.category.alias})
            </p>
          )}
        </div>

        {/* Item Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., Fauji, DG Khan"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} {cat.alias ? `(${cat.alias})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Selling Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price (PKR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.selling_price}
            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., 1200.00"
          />
          <p className="mt-1 text-xs text-gray-500">
            Price per {item?.primary_unit || 'unit'} to customers
          </p>
        </div>

        {/* Primary Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.primary_unit}
            onChange={(e) => setFormData({ ...formData, primary_unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., bag, box, piece"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Main unit for stock tracking and sales
          </p>
        </div>

        {/* Secondary Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secondary Unit (Optional)
          </label>
          <input
            type="text"
            value={formData.secondary_unit}
            onChange={(e) => setFormData({ ...formData, secondary_unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., kg, liter"
          />
          <p className="mt-1 text-xs text-gray-500">
            Alternate unit for measurement
          </p>
        </div>

        {/* Conversion Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conversion Rate {formData.secondary_unit && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.conversion_rate}
            onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })}
            disabled={!formData.secondary_unit}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
            placeholder={formData.secondary_unit ? "e.g., 50" : "Set secondary unit first"}
          />
          {!formData.secondary_unit ? (
            <p className="mt-1 text-xs text-gray-500">
              Fill in secondary unit above to enable this field
            </p>
          ) : formData.conversion_rate ? (
            <p className="mt-1 text-xs text-gray-500">
              1 {formData.primary_unit || 'primary unit'} = {formData.conversion_rate} {formData.secondary_unit}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              How many {formData.secondary_unit} in one {formData.primary_unit || 'primary unit'}?
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

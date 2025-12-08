"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { itemsApi, categoriesApi, type CreateOrUpdateItemPayload } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import { invalidateItemsCache } from "../../components/Items/useItemsList";
import type { Category } from "../../lib/types";

export default function NewItemPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
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

  const handleChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast("Please select an image file.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate required fields
    const localErrors: Record<string, string[]> = {};
    if (!formData.name.trim()) localErrors.name = ["Item name is required."];
    if (!formData.primary_unit.trim()) localErrors.primary_unit = ["Primary unit is required."];

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: CreateOrUpdateItemPayload = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || null,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        picture_url: profilePicture || null,
        last_purchase_price: formData.last_purchase_price ? Number(formData.last_purchase_price) : null,
        lowest_purchase_price: formData.lowest_purchase_price ? Number(formData.lowest_purchase_price) : null,
        highest_purchase_price: formData.highest_purchase_price ? Number(formData.highest_purchase_price) : null,
        selling_price: formData.selling_price ? Number(formData.selling_price) : null,
        primary_unit: formData.primary_unit.trim(),
        secondary_unit: formData.secondary_unit.trim() || null,
        conversion_rate: formData.conversion_rate ? Number(formData.conversion_rate) : null,
      };

      await itemsApi.createItem(payload);
      addToast("Item created successfully.", "success");
      
      // Invalidate cache to show fresh data when navigating back
      invalidateItemsCache();
      
      router.push("/items");
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
            addToast("Failed to create item.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to create item.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full py-8">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">New Item</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        {/* Item Picture Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-gray-200">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Item preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-semibold text-white">
                  {formData.name ? getInitials(formData.name) : "?"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg"
              title="Upload item picture"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleChange("name")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Cement, Steel Pipe"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={handleChange("brand")}
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
              onChange={handleChange("category_id")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Last Purchase Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Purchase Price (PKR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.last_purchase_price}
              onChange={handleChange("last_purchase_price")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., 450.00"
            />
          </div>

          {/* Lowest Purchase Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lowest Purchase Price (PKR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.lowest_purchase_price}
              onChange={handleChange("lowest_purchase_price")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., 420.00"
            />
          </div>

          {/* Highest Purchase Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Highest Purchase Price (PKR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.highest_purchase_price}
              onChange={handleChange("highest_purchase_price")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., 480.00"
            />
          </div>

          {/* Purchase Price Info */}
          <div className="md:col-span-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                <span className="font-semibold">Note:</span> Purchase prices will be automatically updated when you receive stock from suppliers.
              </p>
            </div>
          </div>
        </div>

        {/* Profit Margin Display */}
        {formData.selling_price && formData.last_purchase_price && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Profit Margin Preview</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-700">Purchase Price:</p>
                <p className="font-semibold text-green-900">PKR {Number(formData.last_purchase_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-green-700">Selling Price:</p>
                <p className="font-semibold text-green-900">PKR {Number(formData.selling_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-green-700">Profit per {formData.primary_unit}:</p>
                <p className="font-semibold text-green-900">
                  PKR {(Number(formData.selling_price) - Number(formData.last_purchase_price)).toFixed(2)}
                  {' '}
                  ({(((Number(formData.selling_price) - Number(formData.last_purchase_price)) / Number(formData.selling_price)) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unit Management */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Unit Management</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.primary_unit}
                onChange={handleChange("primary_unit")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., bag, box, piece"
              />
              {errors.primary_unit && (
                <p className="mt-1 text-xs text-red-600">{errors.primary_unit[0]}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Main unit for stock tracking
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
                onChange={handleChange("secondary_unit")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., kg, liter, meter"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alternate unit for sales
              </p>
            </div>

            {/* Conversion Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversion Rate
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.conversion_rate}
                onChange={handleChange("conversion_rate")}
                disabled={!formData.secondary_unit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="e.g., 50"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.secondary_unit 
                  ? `1 ${formData.primary_unit} = ? ${formData.secondary_unit}`
                  : "Set secondary unit first"}
              </p>
            </div>
          </div>

          {/* Example Display */}
          {formData.primary_unit && formData.secondary_unit && formData.conversion_rate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Example:</span> If you have 50 {formData.primary_unit}, 
                that equals {(50 * Number(formData.conversion_rate)).toFixed(2)} {formData.secondary_unit}
              </p>
            </div>
          )}
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

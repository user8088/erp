"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, ChevronUp, Info } from "lucide-react";
import { customersApi, type CreateOrUpdateCustomerPayload } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import { invalidateCustomersCache } from "../../components/Customers/useCustomersList";

export default function NewCustomerPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    rating: "5",
    status: "clear" as "clear" | "has_dues",
    opening_due_amount: "",
    opening_advance_balance: "",
  });
  
  const [showOpeningBalances, setShowOpeningBalances] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
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
    if (!formData.name.trim()) localErrors.name = ["Customer name is required."];
    if (!formData.email.trim()) localErrors.email = ["Email is required."];
    
    const rating = Number(formData.rating);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      localErrors.rating = ["Rating must be between 1 and 10."];
    }

    // Validate opening balances
    const openingDueAmount = formData.opening_due_amount.trim() 
      ? parseFloat(formData.opening_due_amount) 
      : null;
    const openingAdvanceBalance = formData.opening_advance_balance.trim() 
      ? parseFloat(formData.opening_advance_balance) 
      : null;

    if (openingDueAmount !== null && (isNaN(openingDueAmount) || openingDueAmount < 0)) {
      localErrors.opening_due_amount = ["Opening due amount must be a non-negative number."];
    }

    if (openingAdvanceBalance !== null && (isNaN(openingAdvanceBalance) || openingAdvanceBalance < 0)) {
      localErrors.opening_advance_balance = ["Opening advance balance must be a non-negative number."];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: CreateOrUpdateCustomerPayload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        rating: Number(formData.rating),
        status: formData.status,
        picture_url: profilePicture || null,
        opening_due_amount: openingDueAmount !== null ? openingDueAmount : undefined,
        opening_advance_balance: openingAdvanceBalance !== null ? openingAdvanceBalance : undefined,
      };

      await customersApi.createCustomer(payload);
      addToast("Customer created successfully.", "success");
      
      // Invalidate cache to show fresh data when navigating back
      invalidateCustomersCache();
      
      router.push("/customer");
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
            addToast("Failed to create customer.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to create customer.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full py-8">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">New Customer</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        {/* Profile Picture Upload */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              {profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePicture}
                  alt="Profile preview"
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
              title="Upload profile picture"
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
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleChange("name")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter customer name"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="customer@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={handleChange("phone")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="+92-300-1234567"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.rating}
              onChange={handleChange("rating")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {errors.rating && (
              <p className="mt-1 text-xs text-red-600">{errors.rating[0]}</p>
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
              <option value="clear">Clear</option>
              <option value="has_dues">Has Dues</option>
            </select>
          </div>

          {/* Address - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={handleChange("address")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter customer address"
            />
          </div>
        </div>

        {/* Opening Balances Section */}
        <div className="border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowOpeningBalances(!showOpeningBalances)}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Opening Balances <span className="text-gray-500 font-normal">(Optional)</span>
              </h3>
              <div title="Add previous payment records for this customer">
                <Info className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            {showOpeningBalances ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showOpeningBalances && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
              <div className="mb-3">
                <p className="text-xs text-gray-600">
                  Record any outstanding amounts or advance payments from previous transactions. 
                  These will be automatically integrated with your Chart of Accounts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opening Due Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Due Amount
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (Outstanding Balance)
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      PKR
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.opening_due_amount}
                      onChange={handleChange("opening_due_amount")}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.opening_due_amount && (
                    <p className="mt-1 text-xs text-red-600">{errors.opening_due_amount[0]}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Amount the customer owes from previous transactions
                  </p>
                </div>

                {/* Opening Advance Balance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Customer Credit
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      (Advance Balance)
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      PKR
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.opening_advance_balance}
                      onChange={handleChange("opening_advance_balance")}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.opening_advance_balance && (
                    <p className="mt-1 text-xs text-red-600">{errors.opening_advance_balance[0]}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Advance payment/credit balance from previous transactions
                  </p>
                </div>
              </div>

              {/* Auto-update status hint */}
              {formData.opening_due_amount.trim() && parseFloat(formData.opening_due_amount) > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Customer status will be automatically set to &quot;Has Dues&quot; 
                    because an opening due amount is specified.
                  </p>
                </div>
              )}
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

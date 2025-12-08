"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import type { Customer } from "../../lib/types";
import { customersApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import { invalidateCustomersCache } from "../Customers/useCustomersList";

interface CustomerDetailsFormProps {
  customerId: string;
  customer: Customer | null;
  onCustomerUpdated: (customer: Customer) => void;
  externalSaveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function CustomerDetailsForm({
  customerId,
  customer,
  onCustomerUpdated,
  externalSaveSignal,
  onSavingChange,
}: CustomerDetailsFormProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    rating: "5",
    status: "clear" as "clear" | "has_dues",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        address: customer.address || "",
        rating: String(customer.rating),
        status: customer.status,
      });
    }
  }, [customer]);

  useEffect(() => {
    if (externalSaveSignal) {
      handleSave();
    }
  }, [externalSaveSignal]);

  const handleSave = async () => {
    if (!customer) return;
    onSavingChange?.(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        rating: Number(formData.rating),
        status: formData.status,
        picture_url: customer.picture_url || null,
      };
      const res = await customersApi.updateCustomer(Number(customerId), payload);
      onCustomerUpdated(res.customer);
      
      // Invalidate cache to show fresh data when navigating back
      invalidateCustomersCache();
      
      addToast("Customer updated successfully.", "success");
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
            addToast("Failed to update customer.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to update customer.", "error");
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Serial Number - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serial Number
          </label>
          <input
            type="text"
            value={customer?.serial_number || ""}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rating (1-10)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="10"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm text-gray-600">{formData.rating}/10</span>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as "clear" | "has_dues" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

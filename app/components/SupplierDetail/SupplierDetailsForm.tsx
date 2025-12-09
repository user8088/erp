"use client";

import { useState, useEffect } from "react";
import { suppliersApi, customersApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import { invalidateSuppliersCache } from "../Suppliers/useSuppliersList";
import type { Supplier, Customer } from "../../lib/types";

interface SupplierDetailsFormProps {
  supplierId: string;
  supplier: Supplier | null;
  onSupplierUpdated: (supplier: Supplier) => void;
  externalSaveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function SupplierDetailsForm({
  supplierId,
  supplier,
  onSupplierUpdated,
  externalSaveSignal,
  onSavingChange,
}: SupplierDetailsFormProps) {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    rating: "5",
    status: "active" as "active" | "inactive",
    customer_id: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        rating: String(supplier.rating),
        status: supplier.status,
        customer_id: supplier.customer_id ? String(supplier.customer_id) : "",
      });
    }
  }, [supplier]);

  useEffect(() => {
    if (externalSaveSignal) {
      handleSave();
    }
  }, [externalSaveSignal]);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await customersApi.getCustomers({ per_page: 100 });
        setCustomers(response.data);
      } catch (error) {
        console.error("Failed to load customers:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleSave = async () => {
    if (!supplier) return;
    onSavingChange?.(true);
    try {
      const payload = {
        name: formData.name,
        contact_person: formData.contact_person || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        picture_url: supplier.picture_url || null,
        rating: Number(formData.rating),
        status: formData.status,
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
      };

      const response = await suppliersApi.updateSupplier(Number(supplierId), payload);
      onSupplierUpdated(response.supplier);
      
      // Invalidate cache to show fresh data when navigating back
      invalidateSuppliersCache();
      
      addToast("Supplier updated successfully.", "success");
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
            addToast("Failed to update supplier.", "error");
          }
          return;
        }
      }
      
      addToast("Failed to update supplier.", "error");
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
            value={supplier?.serial_number || ""}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* Supplier Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Contact Person */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
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
          <input
            type="number"
            min="1"
            max="10"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Link to Customer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link to Customer
          </label>
          <select
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            disabled={loadingCustomers}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Not a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.serial_number})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            If this supplier is also your customer
          </p>
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

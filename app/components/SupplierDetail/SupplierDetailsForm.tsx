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
    opening_balance: "0",
    opening_advance_balance: "0",
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
        opening_balance: String(supplier.opening_balance || 0),
        opening_advance_balance: String(supplier.opening_advance_balance || 0),
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
        // Filter out guest customers
        const filteredCustomers = response.data.filter(
          customer => !customer.serial_number?.toUpperCase().startsWith("GUEST")
        );
        setCustomers(filteredCustomers);
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
      const openingBalance = Number(formData.opening_balance) || 0;
      const openingAdvance = Number(formData.opening_advance_balance) || 0;

      if (openingBalance > 0 && openingAdvance > 0) {
        addToast("Opening balance and advance balance are mutually exclusive.", "error");
        onSavingChange?.(false);
        return;
      }

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
        opening_balance: openingBalance,
        opening_advance_balance: openingAdvance,
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

      <h2 className="text-base font-semibold text-gray-900 pt-4 border-t border-gray-100">Financial Information</h2>

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Opening balance (Payable) and Opening advance balance cannot coexist.
          Entering one will automatically clear the other.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opening Balance (Payable) */}
        <div className="relative group">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            Opening Balance (Payable)
            <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center cursor-help" title="The amount you already owe this supplier at the time of system setup.">?</div>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">PKR</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.opening_balance}
              onChange={(e) => {
                const val = e.target.value;
                if (val.trim() && parseFloat(val) > 0) {
                  setFormData({ ...formData, opening_balance: val, opening_advance_balance: "0" });
                } else {
                  setFormData({ ...formData, opening_balance: val });
                }
              }}
              className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Opening Advance Balance */}
        <div className="relative group">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            Opening Advance Balance
            <div className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center cursor-help" title="The amount you have already prepaid to this supplier for future orders.">?</div>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">PKR</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.opening_advance_balance}
              onChange={(e) => {
                const val = e.target.value;
                if (val.trim() && parseFloat(val) > 0) {
                  setFormData({ ...formData, opening_advance_balance: val, opening_balance: "0" });
                } else {
                  setFormData({ ...formData, opening_advance_balance: val });
                }
              }}
              className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import CustomerDetailHeader from "../../components/CustomerDetail/CustomerDetailHeader";
import CustomerDetailSidebar from "../../components/CustomerDetail/CustomerDetailSidebar";
import CustomerDetailContent from "../../components/CustomerDetail/CustomerDetailContent";
import { customersApi } from "../../lib/apiClient";
import type { Customer } from "../../lib/types";

interface CustomerDetailClientProps {
  id: string;
}

export default function CustomerDetailClient({ id }: CustomerDetailClientProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await customersApi.getCustomer(Number(id));
        if (!cancelled) {
          // Check if this is a guest customer and prevent access
          if (res.customer.serial_number?.toUpperCase().startsWith("GUEST")) {
            setError("Guest customer profiles are not accessible. Guest customers are system accounts used for walk-in sales.");
            setCustomer(null);
            return;
          }
          setCustomer(res.customer);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load customer.";
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleProfilePictureChange = (imageUrl: string) => {
    if (customer) {
      setCustomer({ ...customer, picture_url: imageUrl });
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <CustomerDetailHeader
        customerId={id}
        customer={customer}
        saving={saving}
        onSave={() => setSaveVersion((v) => v + 1)}
      />
      <div className="flex gap-6 mt-4">
        <CustomerDetailSidebar 
          customer={customer}
          onProfilePictureChange={handleProfilePictureChange}
        />
        <div className="flex-1">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          {loading && !customer ? (
            <div className="text-sm text-gray-500">Loading customer...</div>
          ) : (
            <CustomerDetailContent
              customerId={id}
              customer={customer}
              onCustomerChange={setCustomer}
              saveSignal={saveVersion}
              onSavingChange={setSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

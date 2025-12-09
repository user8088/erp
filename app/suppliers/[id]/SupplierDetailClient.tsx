"use client";

import { useState, useEffect } from "react";
import SupplierDetailHeader from "../../components/SupplierDetail/SupplierDetailHeader";
import SupplierDetailSidebar from "../../components/SupplierDetail/SupplierDetailSidebar";
import SupplierDetailContent from "../../components/SupplierDetail/SupplierDetailContent";
import type { Supplier } from "../../lib/types";

interface SupplierDetailClientProps {
  supplier: Supplier;
  onSupplierUpdated: (supplier: Supplier) => void;
}

export default function SupplierDetailClient({ supplier: initialSupplier, onSupplierUpdated }: SupplierDetailClientProps) {
  const [supplier, setSupplier] = useState(initialSupplier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSupplier(initialSupplier);
  }, [initialSupplier]);

  const handleSupplierUpdate = (updated: Supplier) => {
    setSupplier(updated);
    onSupplierUpdated(updated);
  };

  const handleProfilePictureChange = (newPictureUrl: string) => {
    if (supplier) {
      setSupplier({ ...supplier, picture_url: newPictureUrl });
    }
  };

  return (
    <div className="max-w-full mx-auto min-h-full">
      <SupplierDetailHeader
        supplierId={String(supplier.id)}
        supplier={supplier}
        saving={saving}
        onSave={() => setSaveVersion((v) => v + 1)}
      />
      <div className="flex gap-6 mt-4">
        <SupplierDetailSidebar 
          supplier={supplier}
          onProfilePictureChange={handleProfilePictureChange}
        />
        <div className="flex-1">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          {loading && !supplier ? (
            <div className="text-sm text-gray-500">Loading supplier...</div>
          ) : (
            <SupplierDetailContent
              supplierId={String(supplier.id)}
              supplier={supplier}
              onSupplierChange={setSupplier}
              saveSignal={saveVersion}
              onSavingChange={setSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

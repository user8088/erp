"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { suppliersApi } from "../../lib/apiClient";
import type { Supplier } from "../../lib/types";
import SupplierDetailClient from "./SupplierDetailClient";

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = Number(params.id);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await suppliersApi.getSupplier(supplierId);
        setSupplier(response.supplier);
      } catch (error) {
        console.error("Failed to fetch supplier:", error);
      } finally {
        setLoading(false);
      }
    };

    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading supplier...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Supplier not found</p>
      </div>
    );
  }

  return <SupplierDetailClient supplier={supplier} onSupplierUpdated={setSupplier} />;
}

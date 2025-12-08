"use client";

import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState("details");

  const handleSupplierUpdate = (updated: Supplier) => {
    setSupplier(updated);
    onSupplierUpdated(updated);
  };

  const handleProfilePictureChange = (newPictureUrl: string) => {
    setSupplier({ ...supplier, picture_url: newPictureUrl });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SupplierDetailHeader supplier={supplier} />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <SupplierDetailSidebar 
              supplier={supplier}
              onProfilePictureChange={handleProfilePictureChange}
            />
          </div>
          
          <div className="lg:col-span-3">
            <SupplierDetailContent
              supplier={supplier}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSupplierUpdated={handleSupplierUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

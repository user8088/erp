"use client";

import { useRef } from "react";
import { Camera, User, Paperclip, Tag, Clock } from "lucide-react";
import { suppliersApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import { invalidateSuppliersCache } from "../Suppliers/useSuppliersList";
import type { Supplier } from "../../lib/types";

interface SupplierDetailSidebarProps {
  supplier: Supplier;
  onProfilePictureChange: (newPictureUrl: string) => void;
}

export default function SupplierDetailSidebar({ supplier, onProfilePictureChange }: SupplierDetailSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast("Please select an image file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      try {
        await suppliersApi.updateSupplier(supplier.id, {
          picture_url: base64String,
        });
        
        onProfilePictureChange(base64String);
        addToast("Profile picture updated successfully", "success");
        invalidateSuppliersCache();
      } catch (error) {
        addToast("Failed to update profile picture", "error");
        console.error(error);
      }
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              {supplier.picture_url ? (
                <img
                  src={supplier.picture_url}
                  alt={supplier.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-semibold text-white">
                  {getInitials(supplier.name)}
                </span>
              )}
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-all duration-200"
            >
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-gray-900 text-center">{supplier.name}</h2>
          <p className="text-sm text-gray-500">{supplier.serial_number}</p>
        </div>
      </div>

      {/* Linked Customer */}
      {supplier.customer && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <User className="w-4 h-4 text-gray-600" />
            Linked Customer
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900">{supplier.customer.name}</p>
            <p className="text-xs text-blue-700 mt-1">{supplier.customer.serial_number}</p>
          </div>
        </div>
      )}

      {/* Total Purchases */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
          <User className="w-4 h-4 text-gray-600" />
          Total Purchases
        </div>
        <p className="text-2xl font-bold text-orange-600">
          PKR {Number(supplier.total_purchase_amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-gray-500 mt-1">Lifetime total</p>
      </div>

      {/* Attachments Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
          <Paperclip className="w-4 h-4 text-gray-600" />
          Attachments
        </div>
        <p className="text-sm text-gray-500">No attachments</p>
      </div>

      {/* Tags Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
          <Tag className="w-4 h-4 text-gray-600" />
          Tags
        </div>
        <p className="text-sm text-gray-500">No tags</p>
      </div>

      {/* Activity Log */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
          <Clock className="w-4 h-4 text-gray-600" />
          Activity
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Created:</span>
            <span className="font-medium">{formatDate(supplier.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated:</span>
            <span className="font-medium">{formatDate(supplier.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

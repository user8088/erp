"use client";

import { User, Paperclip, Tag, Camera } from "lucide-react";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "../ui/ToastProvider";
import type { Supplier } from "../../lib/types";

interface SupplierDetailSidebarProps {
  supplier: Supplier | null;
  onProfilePictureChange?: (imageUrl: string) => void;
}

export default function SupplierDetailSidebar({ supplier, onProfilePictureChange }: SupplierDetailSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);

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

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        onProfilePictureChange?.(imageUrl);
        addToast("Profile picture updated successfully.", "success");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      addToast("Failed to upload profile picture.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="relative w-32 h-32 mx-auto">
        <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden">
          {supplier?.picture_url ? (
            <img
              src={supplier.picture_url}
              alt={supplier.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-3xl font-semibold text-white">
                {supplier ? getInitials(supplier.name) : "?"}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-60"
          title="Change profile picture"
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

      {/* Sections */}
      <div className="space-y-2">
        {/* Assigned To */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Assigned To</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p className="mt-1 ml-6 text-xs text-gray-400">Not assigned</p>
        </div>

        {/* Attachments */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Attachments</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p className="mt-1 ml-6 text-xs text-gray-400">No documents attached yet.</p>
        </div>

        {/* Tags */}
        <div className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Tags</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Last edited · {supplier ? new Date(supplier.updated_at).toLocaleDateString() : "—"}</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Created · {supplier ? new Date(supplier.created_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </div>
  );
}

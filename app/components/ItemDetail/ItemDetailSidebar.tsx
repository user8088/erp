"use client";

import { Tag, Camera, Package, X } from "lucide-react";
import { Plus } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/ToastProvider";
import { itemTagsApi } from "../../lib/apiClient";
import type { Item, ItemTag } from "../../lib/types";

interface ItemDetailSidebarProps {
  item: Item | null;
  onPictureChange?: (imageUrl: string) => void;
}

export default function ItemDetailSidebar({ item, onPictureChange }: ItemDetailSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [availableTags, setAvailableTags] = useState<ItemTag[]>([]);
  const [assignedTags, setAssignedTags] = useState<ItemTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    loadAvailableTags();
  }, []);

  useEffect(() => {
    if (item) {
      loadItemTags();
    }
  }, [item]);

  const loadAvailableTags = async () => {
    try {
      const response = await itemTagsApi.getTags({ per_page: 100 });
      setAvailableTags(response.data);
    } catch (error) {
      console.error("Failed to load available tags:", error);
    }
  };

  const loadItemTags = async () => {
    if (!item) return;
    
    try {
      setLoadingTags(true);
      const response = await itemTagsApi.getItemTags(item.id);
      setAssignedTags(response.data);
    } catch (error) {
      console.error("Failed to load item tags:", error);
    } finally {
      setLoadingTags(false);
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

  const handleToggleTag = async (tagId: number) => {
    if (!item) return;
    
    const isAssigned = assignedTags.some(t => t.id === tagId);
    
    try {
      if (isAssigned) {
        await itemTagsApi.removeTagFromItem(tagId, item.id);
        setAssignedTags(assignedTags.filter((t) => t.id !== tagId));
        addToast("Tag removed.", "success");
      } else {
        await itemTagsApi.assignTagToItem(tagId, item.id);
        const tag = availableTags.find(t => t.id === tagId);
        if (tag) {
          setAssignedTags([...assignedTags, tag]);
        }
        addToast("Tag assigned.", "success");
      }
    } catch (error: unknown) {
      console.error("Failed to toggle tag:", error);
      let errorMessage = "Failed to update tag.";
      if (error && typeof error === "object" && "data" in error) {
        const errorData = (error as { data?: { message?: string } }).data;
        errorMessage = errorData?.message || errorMessage;
      }
      addToast(errorMessage, "error");
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!item) return;
    
    try {
      await itemTagsApi.removeTagFromItem(tagId, item.id);
      setAssignedTags(assignedTags.filter((t) => t.id !== tagId));
      addToast("Tag removed.", "success");
    } catch (error) {
      console.error("Failed to remove tag:", error);
      addToast("Failed to remove tag.", "error");
    }
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
        onPictureChange?.(imageUrl);
        addToast("Item picture updated successfully.", "success");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      addToast("Failed to upload item picture.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Item Picture */}
      <div className="relative w-32 h-32 mx-auto">
        <div className="w-full h-full rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-200">
          {item?.picture_url ? (
            <img
              src={item.picture_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              {item ? (
                <span className="text-3xl font-semibold text-white">
                  {getInitials(item.name)}
                </span>
              ) : (
                <Package className="w-16 h-16 text-white" />
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-60"
          title="Change item picture"
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
        {/* Tags */}
        <div className="p-2 rounded bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Tags</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                type="button"
                title="Manage tags"
                onClick={() => router.push("/items/tags")}
              >
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="relative">
                <button
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  type="button"
                  title="Add tag"
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
                
                {/* Tag Dropdown */}
                {showTagDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowTagDropdown(false)}
                    />
                    <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
                      {availableTags.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">
                          No tags available.{" "}
                          <button
                            onClick={() => {
                              setShowTagDropdown(false);
                              router.push("/items/tags");
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            Create one
                          </button>
                        </div>
                      ) : (
                        availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTag(tag.id)}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                            >
                              <span
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </span>
                            {assignedTags.some(t => t.id === tag.id) && (
                              <span className="text-green-600">✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Assigned Tags */}
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {assignedTags.length === 0 ? (
              <span className="text-xs text-gray-400">No tags assigned</span>
            ) : (
              assignedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium group"
                  style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Last edited · {item ? new Date(item.updated_at).toLocaleDateString() : "—"}</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Created · {item ? new Date(item.created_at).toLocaleDateString() : "—"}</p>
        </div>
      </div>
    </div>
  );
}

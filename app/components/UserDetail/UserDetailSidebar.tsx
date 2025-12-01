"use client";

import { useEffect, useRef, useState } from "react";
import { User, Paperclip, Tag } from "lucide-react";
import { Plus } from "lucide-react";

interface UserDetailSidebarProps {
  userId: string;
}

interface SavedTag {
  id: string;
  name: string;
  color: string;
}

const TAG_STORAGE_KEY = "erp_tags";

export default function UserDetailSidebar({ userId }: UserDetailSidebarProps) {
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [availableTags, setAvailableTags] = useState<SavedTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TAG_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setAvailableTags(
          parsed.filter(
            (t: any) =>
              t &&
              typeof t.id === "string" &&
              typeof t.name === "string" &&
              typeof t.color === "string"
          )
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center mx-auto">
        <span className="text-3xl font-semibold text-gray-600">AM</span>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {/* Assigned To */}
        <div
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setShowAssignDropdown((open) => !open)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Assigned To</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssignDropdown((open) => !open);
              }}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {assignedTo && (
            <p className="mt-1 ml-6 text-xs text-gray-500">Assigned to {assignedTo}</p>
          )}
          {showAssignDropdown && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm">
              {["Unassigned", "Manager A", "Manager B"].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setAssignedTo(name === "Unassigned" ? null : name);
                    setShowAssignDropdown(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attachments */}
        <div
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Attachments</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {attachments.length > 0 && (
            <p className="mt-1 ml-6 text-xs text-gray-500">
              {attachments.length} document{attachments.length > 1 ? "s" : ""} attached
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachmentsChange}
          />
        </div>

        {/* Tags */}
        <div
          className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setShowTagMenu((open) => !open)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Tags</span>
            </div>
            <button
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTagMenu((open) => !open);
              }}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {selectedTags.length > 0 && (
            <div className="mt-1 ml-6 flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: `${tag.color}1A`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {showTagMenu && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
              {availableTags.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No tags yet. Create them from Staff → Tag Manager.
                </div>
              ) : (
                availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <span>{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Administrator last edited this · 17 hours ago</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Administrator created this · 17 hours ago</p>
        </div>
      </div>
    </div>
  );
}


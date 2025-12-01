"use client";
 
import { Plus, List, RefreshCw, MoreVertical, ChevronDown, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface UsersActionBarProps {
  viewMode: "list" | "image";
  onChangeView: (mode: "list" | "image") => void;
}

export default function UsersActionBar({ viewMode, onChangeView }: UsersActionBarProps) {
  const [showViewMenu, setShowViewMenu] = useState(false);

  const label = viewMode === "list" ? "List View" : "Image View";
  const Icon = viewMode === "list" ? List : ImageIcon;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowViewMenu((open) => !open)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm text-gray-700"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showViewMenu && (
            <div className="absolute mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
              <button
                type="button"
                onClick={() => {
                  onChangeView("list");
                  setShowViewMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <List className="w-4 h-4" />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeView("image");
                  setShowViewMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image View</span>
              </button>
            </div>
          )}
        </div>
        <button
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
        <Plus className="w-4 h-4" />
        <span>Add User</span>
      </button>
    </div>
  );
}


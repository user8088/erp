"use client";

import { Paperclip, Tag, User } from "lucide-react";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";

export default function StaffDetailSidebar() {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center mx-auto">
        <span className="text-3xl font-semibold text-gray-600">ST</span>
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
          {showAssignDropdown && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm">
              {["Unassigned", "Administrator", "Manager"].map((name) => (
                <button
                  key={name}
                  type="button"
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
          <p className="mt-1 ml-6 text-xs text-gray-400">CNIC, contracts, etc.</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={() => {
              /* stub */
            }}
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
          {showTagMenu && (
            <div className="mt-2 ml-6 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
              {["Onboarding", "Salary Hold", "Remote"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <span>{tag}</span>
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-xs text-gray-500">
          <p>Administrator last edited this · just now</p>
        </div>
        <div className="text-xs text-gray-500">
          <p>Administrator created this · today</p>
        </div>
      </div>
    </div>
  );
}


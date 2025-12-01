"use client";

import { Plus, List, RefreshCw, MoreVertical, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function UsersActionBar() {
  const [showListViewMenu, setShowListViewMenu] = useState(false);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowListViewMenu(!showListViewMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm text-gray-700"
          >
            <List className="w-4 h-4" />
            <span>List View</span>
            <ChevronDown className="w-4 h-4" />
          </button>
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


"use client";

import { User, Paperclip, Tag, Share2, Heart, MessageCircle } from "lucide-react";
import { Plus } from "lucide-react";

interface UserDetailSidebarProps {
  userId: string;
}

export default function UserDetailSidebar({ userId }: UserDetailSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      {/* Avatar */}
      <div className="w-32 h-32 bg-gray-300 rounded-lg flex items-center justify-center mx-auto">
        <span className="text-3xl font-semibold text-gray-600">AM</span>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Assigned To</span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Attachments</span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Tags</span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Share</span>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* User Initials */}
      <div className="pt-4 border-t border-gray-200">
        <span className="text-sm font-medium text-blue-600">AM</span>
      </div>

      {/* Engagement Metrics */}
      <div className="flex items-center gap-4 pt-2">
        <button className="flex items-center gap-1 text-gray-600 hover:text-red-500 transition-colors">
          <Heart className="w-4 h-4" />
          <span className="text-sm">0</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">0</span>
        </button>
        <button className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          FOLLOW
        </button>
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


"use client";

import { Bell, ChevronDown } from "lucide-react";
import SearchBar from "./SearchBar";
import { useSidebar } from "../Sidebar/SidebarContext";
import UserMenu from "./UserMenu";

export default function Header() {
  const { sidebarWidth } = useSidebar();

  return (
    <header
      className="fixed top-0 h-14 bg-white border-b border-gray-200 z-10 flex items-center px-4 gap-4 transition-all duration-300"
      style={{ left: `${sidebarWidth}px`, right: 0 }}
    >
      <div className="w-8 h-8 bg-black flex items-center justify-center rounded">
        <span className="text-white text-xs font-bold">E</span>
      </div>
      <SearchBar />
      <div className="flex items-center gap-3 ml-auto">
        <button
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <div className="relative group">
          <button className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors">
            <span className="text-sm text-gray-700">Help</span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}


"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import NavItemComponent from "./NavItem";
import { navigationData } from "@/data/navigation";
import { useSidebar } from "./SidebarContext";

export default function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const pathname = usePathname();

  const getActiveItemId = () => {
    if (pathname === "/") return "home";
    
    // First check child items
    for (const item of navigationData) {
      if (item.children) {
        const activeChild = item.children.find(child => {
          if (child.href) {
            return pathname === child.href || pathname.startsWith(child.href + "/");
          }
          return false;
        });
        if (activeChild) {
          return activeChild.id;
        }
      }
    }
    
    // Then check top-level items
    const activeItem = navigationData.find(item => {
      if (item.href) {
        return pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
      }
      return false;
    });
    
    return activeItem?.id || null;
  };

  const activeItemId = getActiveItemId();

  return (
    <div
      className={`bg-white border-r border-gray-200 h-screen fixed left-0 top-0 transition-all duration-300 z-20 overflow-x-hidden ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"} px-3 py-3 border-b border-gray-200 overflow-x-hidden`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        {!isCollapsed && (
          <span className="text-sm font-medium text-gray-900">Home</span>
        )}
      </div>
      <nav className="overflow-y-auto overflow-x-hidden h-[calc(100vh-57px)]">
        {navigationData.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isActive={activeItemId === item.id}
          />
        ))}
      </nav>
    </div>
  );
}


"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import NavItemComponent from "./NavItem";
import { navigationData } from "@/data/navigation";
import { useUser } from "../User/UserContext";
import { useSidebar } from "./SidebarContext";

export default function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const pathname = usePathname();
  const { hasAtLeast } = useUser();

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

  const filteredNavigation = navigationData
    .map((item) => {
      // Top-level module-based visibility
      if (item.id === "staff" && !hasAtLeast("module.staff", "read")) {
        return null;
      }
      if (item.id === "customer" && !hasAtLeast("module.customer", "read")) {
        return null;
      }
      if (item.id === "accounting" && !hasAtLeast("module.accounting", "read")) {
        return null;
      }
      if (item.id === "selling" && !hasAtLeast("module.selling", "read")) {
        return null;
      }
      if (item.id === "buying" && !hasAtLeast("module.buying", "read")) {
        return null;
      }
      if (item.id === "stock" && !hasAtLeast("module.stock", "read")) {
        return null;
      }
      if (item.id === "transport" && !hasAtLeast("module.transport", "read")) {
        return null;
      }
      if (item.id === "rental" && !hasAtLeast("module.rental", "read")) {
        return null;
      }
      if (item.id === "supplier" && !hasAtLeast("module.supplier", "read")) {
        return null;
      }
      if (item.id === "store-settings") {
        return item; // Always show for now
      }

      // Child-level checks (e.g. Tag Manager)
      const children =
        item.children?.filter((child) => {
          if (child.id === "tag-manager") {
            return hasAtLeast("module.tag_manager", "read");
          }
          return true;
        }) ?? item.children;

      return { ...item, children };
    })
    .filter(Boolean) as typeof navigationData;

  return (
    <div
      className={`bg-white border-r border-gray-200 h-screen fixed left-0 top-0 transition-all duration-300 z-20 overflow-x-hidden ${isCollapsed ? "w-16" : "w-64"
        }`}
    >
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"} px-3 h-14 border-b border-gray-200 overflow-x-hidden`}>
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
      <nav className="overflow-y-auto overflow-x-hidden h-[calc(100vh-56px)]">
        {filteredNavigation.map((item) => (
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


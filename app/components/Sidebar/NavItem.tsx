"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "./types";
import { useSidebar } from "./SidebarContext";

interface NavItemProps {
  item: NavItem;
  isActive?: boolean;
}

export default function NavItemComponent({ item, isActive = false }: NavItemProps) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  
  // Check if any child is active (for auto-expand only, not for highlighting parent)
  const isChildActive = hasChildren && item.children?.some(child => {
    if (child.href) {
      return pathname === child.href || pathname.startsWith(child.href + "/");
    }
    return false;
  });
  
  // Auto-expand if child is active
  const [isExpanded, setIsExpanded] = useState(item.isExpanded || isChildActive || false);
  
  const Icon = item.icon;
  
  // Check if this item's href matches the current pathname (exact match only)
  // Don't highlight parent if a child is active
  // Special case: Home should only be active when pathname is exactly "/"
  let isCurrentlyActive = false;
  if (item.href === "/") {
    isCurrentlyActive = pathname === "/";
  } else if (item.href) {
    // For other items, check exact match or if pathname starts with the href
    // But only if no child is active
    isCurrentlyActive = !isChildActive && (pathname === item.href || pathname.startsWith(item.href + "/"));
  }
  
  const activeState = isActive || isCurrentlyActive;

  const handleToggle = () => {
    if (hasChildren) {
      // Toggle expansion
      setIsExpanded(!isExpanded);
      // If item has href, navigation will happen via the Link component
      // Don't prevent default so navigation can occur
    }
  };

  if (isCollapsed) {
    // Collapsed state: show only icon, centered with tooltip
    // Skip items without icons (like "PUBLIC" header)
    if (!Icon) {
      return null;
    }
    
    return (
      <div className="relative group overflow-visible">
        {item.href ? (
          <Link
            href={item.href}
            className={`flex items-center justify-center p-3 text-sm transition-all duration-200 w-full ${
              activeState
                ? "bg-orange-50 text-orange-600 border-r-2 border-orange-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
          </Link>
        ) : (
          <div
            className={`flex items-center justify-center p-3 text-sm cursor-pointer transition-all duration-200 w-full ${
              activeState
                ? "bg-orange-50 text-orange-600 border-r-2 border-orange-600"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
          </div>
        )}
        {/* Tooltip on hover when collapsed - positioned outside sidebar */}
        <div className="absolute left-full ml-2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-full before:border-4 before:border-transparent before:border-r-gray-900" style={{ top: '50%', transform: 'translateY(-50%)' }}>
          {item.label}
        </div>
      </div>
    );
  }

  // Expanded state: show icon and label
  const content = (
    <>
      {hasChildren && (
        <span className="w-4 flex items-center justify-center" onClick={handleToggle}>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
      )}
      {!hasChildren && <span className="w-4" />}
      {Icon && <Icon className="w-4 h-4" />}
      <span className="flex-1">{item.label}</span>
    </>
  );

  return (
    <div>
      {item.href ? (
        <Link
          href={item.href}
          className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
            activeState
              ? "bg-orange-50 text-orange-600 border-r-2 border-orange-600"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => {
            if (hasChildren) {
              // Expand/collapse children
              setIsExpanded(!isExpanded);
              // Navigation will happen via Link, don't prevent default
            }
          }}
        >
          {content}
        </Link>
      ) : (
        <div
          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
            activeState
              ? "bg-orange-50 text-orange-600 border-r-2 border-orange-600"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          onClick={handleToggle}
        >
          {content}
        </div>
      )}
      {hasChildren && isExpanded && !isCollapsed && (
        <div className="ml-4">
          {item.children?.map((child) => {
            const isChildCurrentlyActive = Boolean(
              child.href && (child.href === pathname || pathname.startsWith(child.href + "/"))
            );
            return (
              <NavItemComponent 
                key={child.id} 
                item={child} 
                isActive={isChildCurrentlyActive}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}


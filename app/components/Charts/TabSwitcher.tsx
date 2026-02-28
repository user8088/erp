"use client";

import { ReactNode } from "react";

export interface TabOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabSwitcherProps {
  tabs: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function TabSwitcher({
  tabs,
  activeId,
  onChange,
}: TabSwitcherProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 p-1 text-xs">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-medium transition-all ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}


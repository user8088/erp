"use client";

interface StockTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function StockTabs({ activeTab, onTabChange }: StockTabsProps) {
  const tabs = [
    { id: "inventory", label: "Inventory Overview" },
    { id: "purchase-orders", label: "Purchase Orders" },
    { id: "movements", label: "Stock Movements" },
    { id: "alerts", label: "Low Stock Alerts" },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-3 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

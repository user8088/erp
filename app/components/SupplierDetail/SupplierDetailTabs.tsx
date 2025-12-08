"use client";

interface SupplierDetailTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function SupplierDetailTabs({ activeTab, onTabChange }: SupplierDetailTabsProps) {
  const tabs = [
    { id: "details", label: "Supplier Details" },
    { id: "purchase-orders", label: "Purchase Orders" },
    { id: "payments", label: "Payments" },
    { id: "items-supplied", label: "Items Supplied" },
    { id: "more-info", label: "More Information" },
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

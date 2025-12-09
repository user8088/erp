"use client";

interface SupplierDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function SupplierDetailTabs({
  activeTab,
  setActiveTab,
}: SupplierDetailTabsProps) {
  const tabs = [
    { id: "supplier-details", label: "Supplier Details" },
    { id: "purchase-orders", label: "Purchase Orders" },
    { id: "payments", label: "Payments" },
    { id: "items-supplied", label: "Items Supplied" },
    { id: "more-information", label: "More Information" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

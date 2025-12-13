"use client";

interface VehicleDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function VehicleDetailTabs({
  activeTab,
  setActiveTab,
}: VehicleDetailTabsProps) {
  const tabs = [
    { id: "vehicle-details", label: "Vehicle Details" },
    { id: "maintenance", label: "Maintenance" },
    { id: "delivery-orders", label: "Delivery Orders" },
    { id: "profitability", label: "Profitability" },
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


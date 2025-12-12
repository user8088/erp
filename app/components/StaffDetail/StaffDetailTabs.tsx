"use client";

interface StaffDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function StaffDetailTabs({
  activeTab,
  setActiveTab,
}: StaffDetailTabsProps) {
  const tabs = [
    { id: "staff-details", label: "Staff Details" },
    { id: "roles-permissions", label: "Roles & Permissions" },
    { id: "attendance", label: "Attendance" },
    { id: "salary", label: "Salary & Invoices" },
    { id: "advances", label: "Advances" },
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


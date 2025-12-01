"use client";

interface UserDetailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function UserDetailTabs({ activeTab, setActiveTab }: UserDetailTabsProps) {
  const tabs = [
    { id: "user-details", label: "User Details" },
    { id: "roles-permissions", label: "Roles & Permissions" },
    { id: "more-information", label: "More Information" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="border-b border-gray-200">
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-orange-600 border-b-2 border-orange-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}


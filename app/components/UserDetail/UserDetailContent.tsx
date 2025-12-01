"use client";

import { useState } from "react";
import UserDetailTabs from "./UserDetailTabs";
import UserDetailsForm from "./UserDetailsForm";
import UserComments from "./UserComments";
import UserActivity from "./UserActivity";

interface UserDetailContentProps {
  userId: string;
}

export default function UserDetailContent({ userId }: UserDetailContentProps) {
  const [activeTab, setActiveTab] = useState("user-details");

  return (
    <div className="flex-1">
      <UserDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "user-details" && (
          <>
            <UserDetailsForm />
            <UserComments />
            <UserActivity />
          </>
        )}
        {activeTab === "roles-permissions" && (
          <div className="p-4 text-gray-500">Roles & Permissions content coming soon...</div>
        )}
        {activeTab === "more-information" && (
          <div className="p-4 text-gray-500">More Information content coming soon...</div>
        )}
        {activeTab === "settings" && (
          <div className="p-4 text-gray-500">Settings content coming soon...</div>
        )}
        {activeTab === "connections" && (
          <div className="p-4 text-gray-500">Connections content coming soon...</div>
        )}
      </div>
    </div>
  );
}


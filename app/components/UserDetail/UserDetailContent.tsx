"use client";

import { useState } from "react";
import UserDetailTabs from "./UserDetailTabs";
import UserDetailsForm from "./UserDetailsForm";
import UserActivity from "./UserActivity";
import MoreInformation from "./MoreInformation";
import UserSettings from "./UserSettings";
import UserRolesPermissions from "./UserRolesPermissions";
import type { User, UserProfile } from "../../lib/types";

interface UserDetailContentProps {
  userId: string;
  user: User | null;
  profile: UserProfile | null;
  onUserChange: (user: User | null) => void;
  onProfileChange: (profile: UserProfile | null) => void;
  saveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function UserDetailContent({
  userId,
  user,
  profile,
  onUserChange,
  onProfileChange,
  saveSignal,
  onSavingChange,
}: UserDetailContentProps) {
  const [activeTab, setActiveTab] = useState("user-details");

  return (
    <div className="flex-1">
      <UserDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "user-details" && (
          <>
            <UserDetailsForm
              userId={userId}
              user={user}
              onUserUpdated={onUserChange}
              externalSaveSignal={saveSignal}
              onSavingChange={onSavingChange}
            />
            <UserActivity />
          </>
        )}
        {activeTab === "roles-permissions" && <UserRolesPermissions />}
        {activeTab === "more-information" && (
          <MoreInformation
            userId={userId}
            profile={profile}
            onProfileUpdated={onProfileChange}
          />
        )}
        {activeTab === "settings" && (
          <UserSettings
            userId={userId}
            status={user?.status}
            onStatusChange={(status) => {
              if (user) onUserChange({ ...user, status });
            }}
          />
        )}
      </div>
    </div>
  );
}


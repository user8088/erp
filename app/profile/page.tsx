"use client";

import { User, Mail, Briefcase, LogOut } from "lucide-react";
import { useUser } from "../components/User/UserContext";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, logout } = useUser();
  const router = useRouter();

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto min-h-full flex items-center justify-center">
        <p className="text-gray-500">No user found. Please log in.</p>
      </div>
    );
  }

  const displayName = user.full_name || user.first_name || user.email;
  const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0].name : "Not specified";
  const initials =
    user.initials ||
    (displayName || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="max-w-4xl mx-auto min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profile & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-semibold">{initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">{primaryRole}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/staff/users/${user.id}`)}
            className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded transition-colors"
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Form */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
              {displayName}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
              {user.email}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4" />
              Role
            </label>
            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
              {primaryRole}
            </p>
          </div>

          {/* Editing is done on the Staff → User detail page; this view is read-only */}
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">Manage your notification preferences</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive email updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Logout</p>
            <p className="text-xs text-gray-500">Sign out of your account</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}


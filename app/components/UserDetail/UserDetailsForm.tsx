"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import type { User } from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

interface UserDetailsFormProps {
  userId: string;
  user: User | null;
  onUserUpdated: (user: User | null) => void;
  onSavingChange?: (saving: boolean) => void;
  externalSaveSignal?: number;
}

export default function UserDetailsForm({
  userId,
  user,
  onUserUpdated,
  onSavingChange,
  externalSaveSignal,
}: UserDetailsFormProps) {
  const { addToast } = useToast();

  const computeFullName = (first: string, middle: string, last: string) => {
    return [first, middle, last].filter(Boolean).join(" ");
  };

  const [formData, setFormData] = useState({
    enabled: true,
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    fullName: "",
    username: "",
    language: "",
    timeZone: "",
  });

  useEffect(() => {
    if (!user) return;
    const first = user.first_name ?? "";
    const middle = user.middle_name ?? "";
    const last = user.last_name ?? "";
    setFormData({
      enabled: user.status === "active",
      email: user.email ?? "",
      firstName: first,
      middleName: middle,
      lastName: last,
      // Always derive full name from parts so we don't depend on backend's
      // denormalized full_name field.
      fullName: computeFullName(first, middle, last),
      username: user.username ?? "",
      language: user.language ?? "English",
      timeZone: user.time_zone ?? "",
    });
  }, [user]);

  // Trigger save when parent increments the externalSaveSignal counter.
  // Guard with a ref so React Strict Mode doesn't cause duplicate saves.
  const lastSignalRef = useRef<number | null>(null);
  useEffect(() => {
    if (externalSaveSignal == null) return;

    // On first mount, just record the initial signal value so we don't
    // immediately auto-save when the detail page loads.
    if (lastSignalRef.current === null) {
      lastSignalRef.current = externalSaveSignal;
      return;
    }

    if (lastSignalRef.current === externalSaveSignal) return;
    lastSignalRef.current = externalSaveSignal;
    void handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSaveSignal]);

  const handleSave = async () => {
    if (!user) return;
    onSavingChange?.(true);
    try {
      const res = await apiClient.put<{ user: User }>(`/users/${userId}`, {
        email: formData.email,
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName || null,
        username: formData.username || null,
        language: formData.language,
        time_zone: formData.timeZone || null,
        status: formData.enabled ? "active" : "inactive",
      });
      onUserUpdated(res.user);
      addToast("User details saved.", "success");
    } catch (e) {
      console.error(e);
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to save user.";
      addToast(message, "error");
    } finally {
      onSavingChange?.(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      {/* Enabled Checkbox */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Enabled</span>
        </label>
      </div>

      {/* Basic Info Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => {
                  const firstName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    firstName,
                    fullName: computeFullName(firstName, prev.middleName, prev.lastName),
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => {
                  const middleName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    middleName,
                    fullName: computeFullName(prev.firstName, middleName, prev.lastName),
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => {
                  const lastName = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    lastName,
                    fullName: computeFullName(prev.firstName, prev.middleName, lastName),
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name (auto)
              </label>
              <input
                type="text"
                value={formData.fullName}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
              <input
                type="text"
                value={formData.timeZone}
                onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top header Save button now triggers saving; no separate Save here */}
    </div>
  );
}


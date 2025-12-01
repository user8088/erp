"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getStoredRoles,
  saveStoredRoles,
  type RoleDefinition,
  type AccessLevel,
} from "../../../utils/rolesStorage";
import { useToast } from "../../../components/ui/ToastProvider";

const MODULES = [
  "Dashboard",
  "Accounting",
  "Buying",
  "Selling",
  "Stock",
  "Staff",
  "Transport",
  "Rental",
  "Supplier",
];

export default function CreateRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleIdFromQuery = searchParams.get("roleId");
  const { addToast } = useToast();

  // Determine if we're editing and load any existing role data once
  const existingRole =
    roleIdFromQuery != null
      ? getStoredRoles().find((r) => r.id === roleIdFromQuery) ?? null
      : null;

  const [roleName, setRoleName] = useState(existingRole?.name ?? "");
  const [description, setDescription] = useState(
    existingRole?.description ?? ""
  );
  const [access, setAccess] = useState<Record<string, AccessLevel>>(() => {
    const initial: Record<string, AccessLevel> = {};
    MODULES.forEach((m) => {
      initial[m] = "read";
    });

    if (existingRole?.permissions) {
      Object.entries(existingRole.permissions).forEach(([key, value]) => {
        if (MODULES.includes(key)) {
          initial[key] = value;
        }
      });
    }

    return initial;
  });

  const handleChangeAccess = (module: string, level: AccessLevel) => {
    setAccess((prev) => ({ ...prev, [module]: level }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = roleName.trim();
    if (!trimmedName) return;

    const generatedId = trimmedName.toLowerCase().replace(/\s+/g, "_");
    const targetId = roleIdFromQuery ?? generatedId;

    const existing = getStoredRoles();
    const updated: RoleDefinition[] = [
      ...existing.filter((r) => r.id !== targetId),
      {
        id: targetId,
        name: trimmedName,
        checked: true,
        description,
        permissions: access,
      },
    ];
    saveStoredRoles(updated);

    addToast(
      roleIdFromQuery ? "Role updated successfully." : "Role created successfully.",
      "success"
    );

    router.back();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">New Role</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Basic Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Page Permissions
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    Module
                  </th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-700">
                    No Access
                  </th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-700">
                    Read
                  </th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-700">
                    Read &amp; Write
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => (
                  <tr key={module} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-800">{module}</td>
                    {(["no-access", "read", "read-write"] as AccessLevel[]).map(
                      (level) => (
                        <td
                          key={level}
                          className="px-4 py-2 text-center align-middle"
                        >
                          <input
                            type="radio"
                            name={module}
                            checked={access[module] === level}
                            onChange={() =>
                              handleChangeAccess(module, level)
                            }
                            className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Save Role
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}



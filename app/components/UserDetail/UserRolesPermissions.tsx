/* Roles & Permissions tab – ERPNext-style UI (local-only for now) */
"use client";

import { useEffect, useState } from "react";
import {
  getStoredRoles,
  saveStoredRoles,
  type RoleDefinition,
} from "../../utils/rolesStorage";

type Role = RoleDefinition;

export default function UserRolesPermissions() {
  const [roleProfile, setRoleProfile] = useState("");
  const [roles, setRoles] = useState<Role[]>(() => getStoredRoles());

  const handleToggleRole = (id: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === id ? { ...role, checked: !role.checked } : role
      )
    );
  };

  const handleSelectAll = () => {
    setRoles((prev) =>
      prev.map((role) => ({
        ...role,
        checked: true,
      }))
    );
  };

  const handleUnselectAll = () => {
    setRoles((prev) =>
      prev.map((role) => ({
        ...role,
        checked: false,
      }))
    );
  };

  // Persist roles so new ones and edits are shared with the create-role page
  useEffect(() => {
    if (roles.length) {
      saveStoredRoles(roles);
    }
  }, [roles]);

  const columns = [roles.slice(0, 15), roles.slice(15, 30), roles.slice(30)];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Roles</h3>

      {/* Role Profile */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role Profile
        </label>
        <input
          type="text"
          value={roleProfile}
          onChange={(e) => setRoleProfile(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
        />
      </div>

      {/* Select / Unselect All */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={handleSelectAll}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={handleUnselectAll}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700"
        >
          Unselect All
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {columns.map((col, colIndex) => (
          <div key={colIndex} className="space-y-2">
            {col.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={role.checked}
                  onChange={() => handleToggleRole(role.id)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span>{role.name}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


/* Roles & Permissions tab – now backed by Laravel Roles API */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../ui/ToastProvider";
import { apiClient } from "../../lib/apiClient";
import type { Paginated, Role, RoleSummary, User } from "../../lib/types";

interface UserRolesPermissionsProps {
  userId: string;
  externalSaveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

// In-memory caches to avoid refetching on navigation
let allRolesCache: RoleSummary[] | null = null;
const userRoleIdsCache: Record<string, (string | number)[]> = {};

export default function UserRolesPermissions({
  userId,
  externalSaveSignal,
  onSavingChange,
}: UserRolesPermissionsProps) {
  const { addToast } = useToast();
  const [roleProfile, setRoleProfile] = useState("");
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string | number>>(
    new Set()
  );
  // Track last save signal so top Save button can trigger role saving
  // without causing an immediate save on first mount.
  const lastSignalRef = useRef<number | null>(null);

  // Load all roles and the user's current roles with caching
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        let rolesData: RoleSummary[];

        if (allRolesCache) {
          rolesData = allRolesCache;
        } else {
          const rolesRes = await apiClient.get<Paginated<Role>>("/roles");
          rolesData = rolesRes.data;
          allRolesCache = rolesData;
        }

        let roleIds: (string | number)[];
        if (userRoleIdsCache[userId]) {
          roleIds = userRoleIdsCache[userId];
        } else {
          const userRes = await apiClient.get<{ user: User }>(`/users/${userId}`);
          const currentRoles = userRes.user.roles ?? [];
          roleIds = currentRoles.map((r) => r.id);
          userRoleIdsCache[userId] = roleIds;
        }

        if (!mounted) return;

        setRoles(rolesData);
        setSelectedRoleIds(new Set(roleIds));
      } catch (e) {
        console.error(e);
        addToast("Failed to load roles for this user.", "error");
      } finally {
        // no-op
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [addToast, userId]);

  const handleToggleRole = (id: string | number) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedRoleIds(new Set(roles.map((r) => r.id)));
  };

  const handleUnselectAll = () => {
    setSelectedRoleIds(new Set());
  };

  const handleSaveAssignments = async () => {
    onSavingChange?.(true);
    try {
      const role_ids = Array.from(selectedRoleIds);
      await apiClient.put(`/users/${userId}`, {
        role_ids,
      });
      userRoleIdsCache[userId] = role_ids;
      addToast("User roles updated.", "success");
    } catch (e) {
      console.error(e);
      addToast("Failed to update roles.", "error");
    } finally {
      onSavingChange?.(false);
    }
  };

  // Trigger save from the global header Save button
  useEffect(() => {
    if (externalSaveSignal == null) return;

    if (lastSignalRef.current === null) {
      lastSignalRef.current = externalSaveSignal;
      return;
    }

    if (lastSignalRef.current === externalSaveSignal) return;
    lastSignalRef.current = externalSaveSignal;
    void handleSaveAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSaveSignal]);

  const columns = useMemo(
    () => [roles.slice(0, 15), roles.slice(15, 30), roles.slice(30)],
    [roles]
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Roles</h3>
      </div>

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
                  checked={selectedRoleIds.has(role.id)}
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


"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../../../components/ui/ToastProvider";
import { apiClient } from "../../../lib/apiClient";
import type { AccessLevel, Role } from "../../../lib/types";

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
] as const;

type ModuleName = (typeof MODULES)[number];

const MODULE_CODE_MAP: Record<ModuleName, string> = {
  Dashboard: "module.dashboard",
  Accounting: "module.accounting",
  Buying: "module.buying",
  Selling: "module.selling",
  Stock: "module.stock",
  Staff: "module.staff",
  Transport: "module.transport",
  Rental: "module.rental",
  Supplier: "module.supplier",
};

// Simple in-memory cache of roles by id so editing doesn't refetch
const roleByIdCache: Record<string | number, Role> = {};

export default function CreateRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleIdFromQuery = searchParams.get("roleId");
  const { addToast } = useToast();

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState<Record<ModuleName, AccessLevel>>(() => {
    const initial = {} as Record<ModuleName, AccessLevel>;
    MODULES.forEach((m) => {
      initial[m] = "read";
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  // Load existing role if editing
  useEffect(() => {
    if (!roleIdFromQuery) return;

    let mounted = true;

    const load = async () => {
      try {
        let role: Role;

        if (roleByIdCache[roleIdFromQuery]) {
          role = roleByIdCache[roleIdFromQuery];
        } else {
          const res = await apiClient.get<{ role: Role }>(
            `/roles/${roleIdFromQuery}`
          );
          role = res.role;
          roleByIdCache[role.id] = role;
        }

        if (!mounted) return;
        setRoleName(role.name);
        setDescription(role.description ?? "");

        const next = { ...access };
        MODULES.forEach((m) => {
          next[m] = "read";
        });
        if (role.permissions) {
          role.permissions.forEach((perm) => {
            const moduleEntry = (Object.entries(MODULE_CODE_MAP) as [
              ModuleName,
              string
            ][]).find(([, code]) => code === perm.code);
            if (moduleEntry) {
              const [moduleName] = moduleEntry;
              next[moduleName] = perm.access_level;
            }
          });
        }
        setAccess(next);
      } catch (e) {
        console.error(e);
        addToast("Failed to load role.", "error");
      } finally {
        // no-op
      }
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleIdFromQuery]);

  const handleChangeAccess = (module: ModuleName, level: AccessLevel) => {
    setAccess((prev) => ({ ...prev, [module]: level }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = roleName.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const permissions = MODULES.map((module) => ({
        code: MODULE_CODE_MAP[module],
        access_level: access[module],
      }));

      if (roleIdFromQuery) {
        const res = await apiClient.put<{ role: Role }>(
          `/roles/${roleIdFromQuery}`,
          {
            name: trimmedName,
            description,
            permissions,
          }
        );
        roleByIdCache[res.role.id] = res.role;
        addToast("Role updated successfully.", "success");
      } else {
        const res = await apiClient.post<{ role: Role }>("/roles", {
          name: trimmedName,
          description,
          permissions,
        });
        roleByIdCache[res.role.id] = res.role;
        addToast("Role created successfully.", "success");
      }

      router.back();
    } catch (e) {
      console.error(e);
      addToast("Failed to save role.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {roleIdFromQuery ? "Edit Role" : "New Role"}
        </h1>
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
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Role"}
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



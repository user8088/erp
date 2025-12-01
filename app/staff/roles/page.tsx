"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStoredRoles,
  saveStoredRoles,
  type RoleDefinition,
} from "../../utils/rolesStorage";
import { useToast } from "../../components/ui/ToastProvider";

export default function RolesListPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getStoredRoles());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const performDelete = () => {
    if (!pendingDeleteId) return;
    const updated = roles.filter((r) => r.id !== pendingDeleteId);
    setRoles(updated);
    saveStoredRoles(updated);
    addToast("Role deleted successfully.", "success");
    setPendingDeleteId(null);
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleEdit = (id: string) => {
    router.push(`/staff/roles/new?roleId=${id}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Roles</h1>
        <button
          type="button"
          onClick={() => router.push("/staff/roles/new")}
          className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          New Role
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Role Name
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">
                Description
              </th>
              <th className="text-right px-4 py-2 font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-gray-100">
                <td className="px-4 py-2 text-gray-800">{role.name}</td>
                <td className="px-4 py-2 text-gray-600">
                  {role.description ?? "-"}
                </td>
                <td className="px-4 py-2 text-right">
                  {pendingDeleteId === role.id ? (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        Confirm delete?
                      </span>
                      <button
                        type="button"
                        onClick={performDelete}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={cancelDelete}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEdit(role.id)}
                        className="text-sm text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(role.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={3}
                >
                  No roles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



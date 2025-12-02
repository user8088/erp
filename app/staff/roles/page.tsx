"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/ui/ToastProvider";
import { apiClient } from "../../lib/apiClient";
import type { Paginated, Role } from "../../lib/types";

// In-memory cache so we only fetch roles list once per session
let rolesListCache: Role[] | null = null;

export default function RolesListPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [roles, setRoles] = useState<Role[]>(rolesListCache ?? []);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(
    null
  );

  useEffect(() => {
    // If we already have roles cached, don't refetch
    if (rolesListCache && rolesListCache.length > 0) {
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<Paginated<Role>>("/roles");
        if (mounted) {
          rolesListCache = res.data;
          setRoles(res.data);
        }
      } catch (e) {
        console.error(e);
        addToast("Failed to load roles.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [addToast]);

  const confirmDelete = (id: string | number) => {
    setPendingDeleteId(id);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await apiClient.delete<{ message: string }>(`/roles/${pendingDeleteId}`);
      setRoles((prev) => prev.filter((r) => r.id !== pendingDeleteId));
      addToast("Role deleted successfully.", "success");
    } catch (e) {
      console.error(e);
      addToast("Failed to delete role.", "error");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleEdit = (id: string | number) => {
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
            {!loading && roles.length === 0 && (
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



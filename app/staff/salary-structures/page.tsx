"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { salaryStructuresApi, ApiError } from "../../lib/apiClient";
import type { StaffSalaryStructure } from "../../lib/types";
import { useToast } from "../../components/ui/ToastProvider";
import { useUser } from "../../components/User/UserContext";

export default function SalaryStructuresPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { hasAtLeast } = useUser();
  const canManageStructures = hasAtLeast("staff.salary_structures.manage", "read-write");
  const canViewStructures = hasAtLeast("module.staff", "read");
  
  const [structures, setStructures] = useState<StaffSalaryStructure[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const loadStructures = async () => {
    setLoading(true);
    try {
      const response = await salaryStructuresApi.list({ per_page: 100 });
      setStructures(response.data || []);
    } catch (error: unknown) {
      console.error(error);
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Failed to load salary structures";
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this salary structure?")) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await salaryStructuresApi.delete(id);
      addToast("Salary structure deleted successfully", "success");
      await loadStructures();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof ApiError) {
        addToast((error as { message: string }).message || "Failed to delete salary structure", "error");
      } else {
        const message = error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Failed to delete salary structure";
        addToast(message, "error");
      }
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (!canViewStructures) {
    return (
      <div className="max-w-full mx-auto min-h-full">
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          You don&apos;t have permission to view salary structures.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto min-h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            Salary Structures
          </h1>
          <p className="text-sm text-gray-600">
            Manage salary structure templates
          </p>
        </div>
        {canManageStructures && (
          <button
            onClick={() => router.push("/staff/salary-structures/new")}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Structure</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
          <p className="text-sm">Loading salary structures...</p>
        </div>
      ) : structures.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">No salary structures found</p>
          <p className="text-xs text-gray-400">Create your first salary structure to get started</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Basic Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payable Days</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Allowances</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deductions</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {structures.map((structure) => {
                const id = typeof structure.id === "number" ? structure.id : Number(structure.id);
                return (
                  <tr key={structure.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{structure.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      PKR {structure.basic_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{structure.pay_frequency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{structure.payable_days}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {structure.allowances.length > 0
                        ? `${structure.allowances.length} allowance${structure.allowances.length > 1 ? "s" : ""}`
                        : "None"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {structure.deductions.length > 0
                        ? `${structure.deductions.length} deduction${structure.deductions.length > 1 ? "s" : ""}`
                        : "None"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {canManageStructures && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/staff/salary-structures/${id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(id)}
                            disabled={deletingIds.has(id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            {deletingIds.has(id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


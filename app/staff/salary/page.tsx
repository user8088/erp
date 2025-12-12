"use client";

import { useEffect, useState } from "react";
import SalaryStructureList from "../../components/Staff/Salary/SalaryStructureList";
import SalaryStructureForm from "../../components/Staff/Salary/SalaryStructureForm";
import type { StaffSalaryStructure } from "../../lib/types";
import { salaryStructuresApi } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";

export default function SalaryPage() {
  const { addToast } = useToast();
  const [structures, setStructures] = useState<StaffSalaryStructure[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salaryStructuresApi.list({ per_page: 50 });
      setStructures(res.data ?? []);
    } catch (e) {
      console.error(e);
      setError(
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to load salary structures."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (data: Omit<StaffSalaryStructure, "id">) => {
    try {
      await salaryStructuresApi.create(data);
      addToast("Salary structure created.", "success");
      setShowForm(false);
      await load();
    } catch (e) {
      console.error(e);
      addToast("Failed to create salary structure.", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-full px-2 md:px-0">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Salary Structures</h1>
        <p className="text-sm text-gray-600">
          Manage base salary, allowances, deductions, and payable days. These can be
          assigned to staff and adjusted per person if needed.
        </p>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 min-w-0">
          <SalaryStructureList
            structures={structures}
            onCreate={() => setShowForm(true)}
            onSelect={() => setShowForm(true)}
          />
          {loading && (
            <div className="mt-2 text-sm text-gray-500">Loading structures...</div>
          )}
        </div>
        <div className="min-w-0">
          {showForm && (
            <SalaryStructureForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}


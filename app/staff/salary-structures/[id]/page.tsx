"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { salaryStructuresApi, ApiError } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";
import type { StaffSalaryStructure } from "../../../lib/types";
import { PAY_FREQUENCY_OPTIONS } from "../../../lib/staffConstants";

interface SalaryComponent {
  label: string;
  amount: string;
}

export default function EditSalaryStructurePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [structure, setStructure] = useState<StaffSalaryStructure | null>(null);
  const [form, setForm] = useState({
    name: "",
    basic_amount: "",
    pay_frequency: "monthly" as "monthly" | "biweekly" | "weekly",
    payable_days: "26",
    notes: "",
  });
  const [allowances, setAllowances] = useState<SalaryComponent[]>([]);
  const [deductions, setDeductions] = useState<SalaryComponent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const id = Number(params.id);
        const data = await salaryStructuresApi.get(id);
        setStructure(data);
        setForm({
          name: data.name,
          basic_amount: String(data.basic_amount),
          pay_frequency: data.pay_frequency,
          payable_days: String(data.payable_days),
          notes: data.notes || "",
        });
        setAllowances(data.allowances.map(a => ({ label: a.label, amount: String(a.amount) })));
        setDeductions(data.deductions.map(d => ({ label: d.label, amount: String(d.amount) })));
      } catch (e) {
        console.error(e);
        addToast("Failed to load salary structure", "error");
        router.push("/staff/salary-structures");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id, router, addToast]);

  const addAllowance = () => {
    setAllowances([...allowances, { label: "", amount: "" }]);
  };

  const removeAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index));
  };

  const updateAllowance = (index: number, field: keyof SalaryComponent, value: string) => {
    const updated = [...allowances];
    updated[index] = { ...updated[index], [field]: value };
    setAllowances(updated);
  };

  const addDeduction = () => {
    setDeductions([...deductions, { label: "", amount: "" }]);
  };

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const updateDeduction = (index: number, field: keyof SalaryComponent, value: string) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], [field]: value };
    setDeductions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast("Name is required", "error");
      return;
    }

    setSaving(true);
    try {
      await salaryStructuresApi.update(Number(params.id), {
        name: form.name.trim(),
        basic_amount: Number(form.basic_amount),
        allowances: allowances
          .filter(a => a.label.trim() && a.amount)
          .map(a => ({ label: a.label.trim(), amount: Number(a.amount) })),
        deductions: deductions
          .filter(d => d.label.trim() && d.amount)
          .map(d => ({ label: d.label.trim(), amount: Number(d.amount) })),
        pay_frequency: form.pay_frequency,
        payable_days: Number(form.payable_days),
        notes: form.notes.trim() || null,
      });
      addToast("Salary structure updated successfully", "success");
      router.push("/staff/salary-structures");
    } catch (e) {
      console.error(e);
      if (e instanceof ApiError) {
        addToast(e.message || "Failed to update salary structure", "error");
      } else {
        addToast("Failed to update salary structure", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (!structure) {
    return <div className="text-sm text-red-600">Salary structure not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto min-h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Edit Salary Structure</h1>
        <p className="text-sm text-gray-600">Update salary structure template</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Basic Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.basic_amount}
              onChange={(e) => setForm({ ...form, basic_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={form.pay_frequency}
              onChange={(e) => setForm({ ...form, pay_frequency: e.target.value as "monthly" | "biweekly" | "weekly" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              {PAY_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payable Days <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={form.payable_days}
            onChange={(e) => setForm({ ...form, payable_days: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Allowances</label>
            <button
              type="button"
              onClick={addAllowance}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              + Add Allowance
            </button>
          </div>
          <div className="space-y-2">
            {allowances.map((allowance, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={allowance.label}
                  onChange={(e) => updateAllowance(index, "label", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={allowance.amount}
                  onChange={(e) => updateAllowance(index, "amount", e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => removeAllowance(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              </div>
            ))}
            {allowances.length === 0 && (
              <p className="text-sm text-gray-500">No allowances added</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Deductions</label>
            <button
              type="button"
              onClick={addDeduction}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              + Add Deduction
            </button>
          </div>
          <div className="space-y-2">
            {deductions.map((deduction, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={deduction.label}
                  onChange={(e) => updateDeduction(index, "label", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={deduction.amount}
                  onChange={(e) => updateDeduction(index, "amount", e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => removeDeduction(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              </div>
            ))}
            {deductions.length === 0 && (
              <p className="text-sm text-gray-500">No deductions added</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Update Structure"}
          </button>
        </div>
      </form>
    </div>
  );
}


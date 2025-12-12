"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PayFrequency, SalaryComponent, StaffSalaryStructure } from "../../../lib/types";

interface SalaryStructureFormProps {
  onSubmit: (structure: Omit<StaffSalaryStructure, "id">) => void;
  onCancel?: () => void;
}

const payFrequencies: PayFrequency[] = ["monthly", "biweekly", "weekly"];

export default function SalaryStructureForm({ onSubmit, onCancel }: SalaryStructureFormProps) {
  const [name, setName] = useState("");
  const [basic, setBasic] = useState<number | "">("");
  const [payableDays, setPayableDays] = useState<number | "">(26);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("monthly");
  const [allowances, setAllowances] = useState<SalaryComponent[]>([
    { label: "House Rent", amount: 0 },
  ]);
  const [deductions, setDeductions] = useState<SalaryComponent[]>([
    { label: "Tax", amount: 0 },
  ]);

  const addRow = (setter: React.Dispatch<React.SetStateAction<SalaryComponent[]>>) => {
    setter((prev) => [...prev, { label: "", amount: 0 }]);
  };

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<SalaryComponent[]>>,
    index: number,
    key: "label" | "amount",
    value: string
  ) => {
    setter((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, [key]: key === "amount" ? Number(value) || 0 : value }
          : row
      )
    );
  };

  const removeRow = (
    setter: React.Dispatch<React.SetStateAction<SalaryComponent[]>>,
    index: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || basic === "" || payableDays === "") return;
    onSubmit({
      name: name.trim(),
      basic_amount: Number(basic),
      payable_days: Number(payableDays),
      pay_frequency: payFrequency,
      allowances: allowances.filter((a) => a.label.trim()),
      deductions: deductions.filter((d) => d.label.trim()),
      notes: null,
    });
    setName("");
    setBasic("");
    setPayableDays(26);
    setAllowances([{ label: "House Rent", amount: 0 }]);
    setDeductions([{ label: "Tax", amount: 0 }]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-5 md:p-6 space-y-5"
    >
      <div className="space-y-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">New Salary Structure</h2>
          <p className="text-sm text-gray-600">
            Define base amounts and components; override per staff later.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setName("");
              setBasic("");
              setPayableDays(26);
              setAllowances([{ label: "House Rent", amount: 0 }]);
              setDeductions([{ label: "Tax", amount: 0 }]);
            }}
            className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Save Structure
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Structure Name"
          value={name}
          onChange={(v) => setName(v)}
          placeholder="e.g., Standard Monthly"
        />
        <Field
          label="Basic Pay (PKR)"
          value={basic === "" ? "" : String(basic)}
          onChange={(v) => setBasic(v === "" ? "" : Number(v))}
          type="number"
        />
        <Field
          label="Payable Days"
          value={payableDays === "" ? "" : String(payableDays)}
          onChange={(v) => setPayableDays(v === "" ? "" : Number(v))}
          type="number"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pay Frequency
          </label>
          <select
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {payFrequencies.map((freq) => (
              <option key={freq} value={freq}>
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ComponentGroup
        title="Allowances"
        rows={allowances}
        onAdd={() => addRow(setAllowances)}
        onChange={(index, key, value) => updateRow(setAllowances, index, key, value)}
        onRemove={(index) => removeRow(setAllowances, index)}
      />

      <ComponentGroup
        title="Deductions"
        rows={deductions}
        onAdd={() => addRow(setDeductions)}
        onChange={(index, key, value) => updateRow(setDeductions, index, key, value)}
        onRemove={(index) => removeRow(setDeductions, index)}
      />
    </form>
  );
}

function ComponentGroup({
  title,
  rows,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  rows: SalaryComponent[];
  onAdd: () => void;
  onChange: (index: number, key: "label" | "amount", value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          <span>Add Row</span>
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={`${title}-${index}`}
            className="grid grid-cols-12 gap-2 items-center"
          >
            <input
              type="text"
              value={row.label}
              onChange={(e) => onChange(index, "label", e.target.value)}
              placeholder="Label"
              className="col-span-7 md:col-span-8 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <input
              type="number"
              value={row.amount}
              onChange={(e) => onChange(index, "amount", e.target.value)}
              placeholder="Amount"
              className="col-span-4 md:col-span-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-md flex items-center justify-center"
              aria-label="Remove row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-gray-500">No rows added yet.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>
  );
}


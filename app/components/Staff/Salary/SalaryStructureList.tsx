"use client";

import { Plus, Settings } from "lucide-react";
import type { StaffSalaryStructure } from "../../../lib/types";

interface SalaryStructureListProps {
  structures: StaffSalaryStructure[];
  onCreate: () => void;
  onSelect?: (structure: StaffSalaryStructure) => void;
}

export default function SalaryStructureList({
  structures,
  onCreate,
  onSelect,
}: SalaryStructureListProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Salary Structures</h2>
          <p className="text-sm text-gray-600">
            Define basic pay, allowances, deductions, and payable days.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Structure</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Basic</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Allowances</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Deductions</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Payable Days</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Frequency</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {structures.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No structures yet. Create the first one.
                </td>
              </tr>
            ) : (
              structures.map((structure) => (
                <tr
                  key={structure.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelect?.(structure)}
                >
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {structure.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    PKR {structure.basic_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {structure.allowances.length} item(s)
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {structure.deductions.length} item(s)
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {structure.payable_days} days
                  </td>
                  <td className="px-4 py-3 text-gray-700 capitalize">
                    {structure.pay_frequency}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(structure);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


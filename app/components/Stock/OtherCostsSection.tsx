"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Account } from "../../lib/types";

interface OtherCost {
  id: string; // Temporary ID for UI
  description: string;
  amount: number;
  account_id?: number | null;
}

interface OtherCostsSectionProps {
  costs: OtherCost[];
  onCostsChange: (costs: OtherCost[]) => void;
  accounts: Account[];
  loadingAccounts?: boolean;
}

export default function OtherCostsSection({
  costs,
  onCostsChange,
  accounts,
  loadingAccounts = false,
}: OtherCostsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCost, setNewCost] = useState<Omit<OtherCost, 'id'>>({
    description: "",
    amount: 0,
    account_id: null,
  });

  const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);

  const handleAddCost = () => {
    if (!newCost.description.trim() || newCost.amount <= 0) {
      return;
    }

    const cost: OtherCost = {
      id: `temp-${Date.now()}`,
      description: newCost.description.trim(),
      amount: newCost.amount,
      account_id: newCost.account_id || null,
    };

    onCostsChange([...costs, cost]);
    setNewCost({ description: "", amount: 0, account_id: null });
    setShowAddForm(false);
  };

  const handleRemoveCost = (id: string) => {
    onCostsChange(costs.filter(cost => cost.id !== id));
  };

  const handleUpdateCost = (id: string, field: keyof OtherCost, value: string | number | null) => {
    onCostsChange(
      costs.map(cost =>
        cost.id === id ? { ...cost, [field]: value } : cost
      )
    );
  };

  const expenseAccounts = accounts.filter(
    acc => acc.root_type === 'expense' && !acc.is_disabled && !acc.is_group
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Other Costs</h3>
          <p className="text-xs text-gray-500 mt-1">
            Additional costs (e.g., pickup, transportation) that reduce the amount owed to supplier
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Cost
          </button>
        )}
      </div>

      {/* Add Cost Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Add New Cost</h4>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewCost({ description: "", amount: 0, account_id: null });
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Pickup charges, Transportation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newCost.amount || ""}
                onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Expense Account (Optional)
            </label>
            <select
              value={newCost.account_id || ""}
              onChange={(e) => setNewCost({ ...newCost, account_id: e.target.value ? Number(e.target.value) : null })}
              disabled={loadingAccounts}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            >
              <option value="">Select account (optional)</option>
              {expenseAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number ? `${account.number} - ` : ""}{account.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select an expense account to categorize this cost (e.g., Transportation Costs)
            </p>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewCost({ description: "", amount: 0, account_id: null });
              }}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCost}
              disabled={!newCost.description.trim() || newCost.amount <= 0}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Cost
            </button>
          </div>
        </div>
      )}

      {/* Costs List */}
      {costs.length > 0 ? (
        <div className="space-y-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Account</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={cost.description}
                        onChange={(e) => handleUpdateCost(cost.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={cost.account_id || ""}
                        onChange={(e) => handleUpdateCost(cost.id, 'account_id', e.target.value ? Number(e.target.value) : null)}
                        disabled={loadingAccounts}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                      >
                        <option value="">No account</option>
                        {expenseAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.number ? `${account.number} - ` : ""}{account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost.amount}
                        onChange={(e) => handleUpdateCost(cost.id, 'amount', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveCost(cost.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove cost"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end pt-2 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Total Other Costs:</span>
              <span className="text-base font-semibold text-red-600">
                - PKR {totalCosts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
          <p className="text-sm">No other costs added yet.</p>
          <p className="text-xs mt-1 text-gray-400">
            Click "Add Cost" to add pickup charges, transportation, or other expenses.
          </p>
        </div>
      )}
    </div>
  );
}


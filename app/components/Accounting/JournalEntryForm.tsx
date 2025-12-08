"use client";

import { useState } from "react";
import { journalApi } from "../../lib/apiClient";
import type { JournalEntryLine, Account } from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

interface JournalEntryFormProps {
  accounts: Account[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function JournalEntryForm({ accounts, onSuccess, onCancel }: JournalEntryFormProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    voucher_type: "Journal Entry",
    reference_number: "",
    description: "",
  });

  const [lines, setLines] = useState<JournalEntryLine[]>([
    { account_id: 0, debit: 0, credit: 0, description: "" },
    { account_id: 0, debit: 0, credit: 0, description: "" },
  ]);

  // Filter to only ledger accounts
  const ledgerAccounts = accounts.filter(acc => !acc.is_group && !acc.is_disabled);

  // Helper to format balance with Dr/Cr indicator
  const formatBalance = (account: Account) => {
    if (account.balance === undefined || account.balance === null) {
      return '';
    }
    
    const currency = account.currency || 'PKR';
    const absBalance = Math.abs(account.balance);
    const formattedAmount = absBalance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    // Determine Dr/Cr based on normal balance and actual balance
    let indicator = '';
    if (account.balance === 0) {
      indicator = '';
    } else if (account.normal_balance === 'debit') {
      indicator = account.balance > 0 ? 'Dr' : 'Cr';
    } else {
      indicator = account.balance > 0 ? 'Cr' : 'Dr';
    }
    
    return ` (${currency} ${formattedAmount}${indicator ? ' ' + indicator : ''})`;
  };

  const addLine = () => {
    setLines([...lines, { account_id: 0, debit: 0, credit: 0, description: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: number | string) => {
    const newLines = [...lines];
    if (field === 'account_id') {
      newLines[index][field] = Number(value);
    } else if (field === 'debit' || field === 'credit') {
      newLines[index][field] = Number(value) || 0;
    } else {
      newLines[index][field] = value as string;
    }
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isBalanced) {
      addToast("Debits must equal Credits and be greater than zero.", "error");
      return;
    }

    // Validate all lines have accounts selected
    if (lines.some(line => !line.account_id)) {
      addToast("Please select an account for all lines.", "error");
      return;
    }

    setSaving(true);
    try {
      await journalApi.createJournalEntry({
        ...formData,
        reference_number: formData.reference_number || null,
        description: formData.description || null,
        lines: lines.map(line => ({
          account_id: line.account_id,
          debit: line.debit,
          credit: line.credit,
          description: line.description || null,
        })),
      });
      
      addToast("Journal entry created successfully.", "success");
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        voucher_type: "Journal Entry",
        reference_number: "",
        description: "",
      });
      setLines([
        { account_id: 0, debit: 0, credit: 0, description: "" },
        { account_id: 0, debit: 0, credit: 0, description: "" },
      ]);
      
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
      addToast("Failed to create journal entry.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Type</label>
          <select
            value={formData.voucher_type}
            onChange={(e) => setFormData({ ...formData, voucher_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Journal Entry">Journal Entry</option>
            <option value="Payment">Payment</option>
            <option value="Receipt">Receipt</option>
            <option value="Contra">Contra</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
          <input
            type="text"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Lines Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <select
                      value={line.account_id}
                      onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select Account</option>
                      {ledgerAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.number ? `${acc.number} - ` : ''}{acc.name}{formatBalance(acc)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={line.description || ''}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(index, 'debit', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(index, 'credit', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-right font-medium text-gray-700">Total:</td>
                <td className={`px-4 py-3 text-right font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {totalDebit.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {totalCredit.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        + Add Line
      </button>

      {/* Balance Status */}
      {!isBalanced && totalDebit + totalCredit > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Entry is not balanced. Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isBalanced || saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Creating..." : "Create Entry"}
        </button>
      </div>
    </form>
  );
}

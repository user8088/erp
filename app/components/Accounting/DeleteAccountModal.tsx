"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { accountsApi, type GetAccountsParams } from "../../lib/apiClient";
import type { Account } from "../../lib/types";

interface DeleteAccountModalProps {
  account: Account;
  balance: number | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAccountModal({
  account,
  balance,
  onClose,
  onDeleted,
}: DeleteAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reallocateToAccountId, setReallocateToAccountId] = useState<number | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const hasBalance = balance !== null && balance !== 0;

  useEffect(() => {
    // Load available accounts for reallocation (same root type, not group, not self)
    const loadAccounts = async () => {
      try {
        const params: GetAccountsParams = {
          company_id: account.company_id,
          root_type: account.root_type,
          is_group: false,
        };
        const response = await accountsApi.getAccounts(params);
        // Filter out the account being deleted
        setAvailableAccounts(response.data.filter((acc) => acc.id !== account.id));
      } catch (e) {
        console.error("Failed to load accounts for reallocation", e);
      }
    };

    if (hasBalance) {
      loadAccounts();
    }
  }, [account, hasBalance]);

  const handleDelete = async () => {
    if (hasBalance && !reallocateToAccountId) {
      setError("Please select an account to reallocate the balance to.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await accountsApi.deleteAccount(
        account.id, 
        hasBalance && reallocateToAccountId ? reallocateToAccountId : undefined
      );
      onDeleted();
    } catch (e) {
      console.error("Failed to delete account", e);
      setError(e instanceof Error ? e.message : "Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = availableAccounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              You are about to delete the account:{" "}
              <span className="font-semibold text-gray-900">{account.name}</span>
              {account.number && (
                <span className="text-gray-500"> ({account.number})</span>
              )}
            </p>
            
            {account.has_children && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This account has child accounts. You must delete or
                  move all child accounts before deleting this account.
                </p>
              </div>
            )}

            {hasBalance && !account.has_children && (
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm text-orange-800">
                    <strong>Balance detected:</strong> This account has a balance of{" "}
                    <span className="font-semibold">
                      {balance!.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {account.currency || "PKR"}
                    </span>
                    . Please select an account to transfer this balance to.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Reallocate balance to:
                  </label>
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <select
                    value={reallocateToAccountId || ""}
                    onChange={(e) =>
                      setReallocateToAccountId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select an account...</option>
                    {filteredAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.number ? `${acc.number} - ` : ""}
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!hasBalance && !account.has_children && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm text-gray-600">
                  This account has no balance and can be safely deleted.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || account.has_children}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}


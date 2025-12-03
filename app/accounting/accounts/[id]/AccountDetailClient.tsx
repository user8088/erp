"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { accountsApi } from "../../../lib/apiClient";
import type { Account, Transaction, Paginated } from "../../../lib/types";
import { useToast } from "../../../components/ui/ToastProvider";
import { useUser } from "../../../components/User/UserContext";

interface AccountDetailClientProps {
  id: string;
}

export default function AccountDetailClient({ id }: AccountDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { hasAtLeast } = useUser();

  const [account, setAccount] = useState<Account | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    tax_rate: "",
    currency: "",
    is_disabled: false,
  });

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsMeta, setTransactionsMeta] = useState<Paginated<Transaction>["meta"] | null>(null);
  const [page, setPage] = useState(1);

  // Balance State
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const canWriteAccounting = hasAtLeast("module.accounting", "read-write");

  // Load Account
  const loadAccount = useCallback(async () => {
    setLoadingAccount(true);
    setAccountError(null);
    try {
      const res = await accountsApi.getAccount(Number(id));
      setAccount(res.account);
      setFormData({
        name: res.account.name,
        number: res.account.number ?? "",
        tax_rate: res.account.tax_rate != null ? String(res.account.tax_rate) : "",
        currency: res.account.currency ?? "",
        is_disabled: res.account.is_disabled,
      });
    } catch (e) {
      console.error(e);
      setAccountError("Failed to load account details.");
    } finally {
      setLoadingAccount(false);
    }
  }, [id]);

  // Load Balance
  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await accountsApi.getAccountBalance(Number(id));
      setBalance(res.balance);
    } catch (e) {
      console.error("Failed to load balance", e);
    } finally {
      setLoadingBalance(false);
    }
  }, [id]);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const res = await accountsApi.getAccountTransactions(Number(id), { page, per_page: 20 });
      setTransactions(res.data);
      setTransactionsMeta(res.meta);
    } catch (e) {
      console.error("Failed to load transactions", e);
      // We don't block the UI if transactions fail, just show empty or error state in that section
    } finally {
      setLoadingTransactions(false);
    }
  }, [id, page]);

  useEffect(() => {
    loadAccount();
    loadBalance();
  }, [loadAccount, loadBalance]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSave = async () => {
    if (!account || !canWriteAccounting) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        number: formData.number || null,
        tax_rate: formData.tax_rate ? Number(formData.tax_rate) : null,
        currency: formData.currency || null,
        is_disabled: formData.is_disabled,
      };
      const res = await accountsApi.updateAccount(account.id, payload);
      setAccount(res.account);
      setIsEditing(false);
      loadBalance(); // Reload balance after update
      addToast("Account updated successfully.", "success");
    } catch (e) {
      console.error(e);
      addToast("Failed to update account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (account) {
      setFormData({
        name: account.name,
        number: account.number ?? "",
        tax_rate: account.tax_rate != null ? String(account.tax_rate) : "",
        currency: account.currency ?? "",
        is_disabled: account.is_disabled,
      });
    }
    setIsEditing(false);
  };

  if (loadingAccount && !account) {
    return <div className="p-8 text-center text-gray-500">Loading account details...</div>;
  }

  if (accountError || !account) {
    return (
      <div className="p-8 text-center text-red-600">
        {accountError || "Account not found."}
        <button onClick={() => router.back()} className="block mx-auto mt-4 text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <button onClick={() => router.back()} className="hover:text-gray-900 transition-colors">
              Accounts
            </button>
            <span>/</span>
            <span>{account.is_group ? "Group" : "Ledger"}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {account.name}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.is_disabled ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
            }`}>
              {account.is_disabled ? "Disabled" : "Active"}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {canWriteAccounting && (
            <button
              onClick={() => router.push("/journal-entry/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
            >
              + New Entry
            </button>
          )}
          <button
            onClick={() => router.push("/chart-of-accounts")}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            Chart of Accounts
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Current Balance</p>
            <div className="flex items-baseline gap-2">
              {loadingBalance ? (
                <span className="text-3xl font-bold text-gray-400">Loading...</span>
              ) : balance !== null ? (
                <>
                  <span className="text-4xl font-bold text-gray-900">
                    {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-lg text-gray-600">{account.currency || "PKR"}</span>
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-400">—</span>
              )}
            </div>
            {account.is_group && (
              <p className="text-xs text-gray-500 mt-1">Cumulative balance of all child accounts</p>
            )}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
              <span className="text-xs font-medium text-gray-500">Type:</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">{account.normal_balance || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
          {canWriteAccounting && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit Details
            </button>
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {/* Read-only Info */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Root Type</label>
            <div className="text-sm font-medium text-gray-900 capitalize">{account.root_type}</div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</label>
            <div className="text-sm font-medium text-gray-900">{account.is_group ? "Group" : "Ledger"}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Account</label>
            <div className="text-sm font-medium text-gray-900">{account.parent_name || "None (Top Level)"}</div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            ) : (
              <div className="text-sm font-medium text-gray-900">{account.name}</div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            ) : (
              <div className="text-sm font-medium text-gray-900">{account.number || "—"}</div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Normal Balance</label>
             <div className="text-sm font-medium text-gray-900 capitalize">{account.normal_balance || "N/A"}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Rate (%)</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            ) : (
              <div className="text-sm font-medium text-gray-900">{account.tax_rate ? `${account.tax_rate}%` : "—"}</div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="Default"
              />
            ) : (
              <div className="text-sm font-medium text-gray-900">{account.currency || "Default"}</div>
            )}
          </div>

          {isEditing && (
             <div className="space-y-1 flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_disabled}
                  onChange={(e) => setFormData({ ...formData, is_disabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Disable Account</span>
              </label>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
          {/* Add filters here if needed */}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
                  {account.is_group && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                  {!account.is_group && (
                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingTransactions ? (
                  <tr>
                    <td colSpan={account.is_group ? 7 : 6} className="px-6 py-12 text-center text-sm text-gray-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={account.is_group ? 7 : 6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No transactions found for this period.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer">
                        {tx.voucher_type} {tx.reference_number ? `#${tx.reference_number}` : ''}
                      </td>
                      {account.is_group && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tx.related_account_name || tx.related_account_number || "—"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={tx.description || ""}>
                        {tx.description || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {tx.debit > 0 ? tx.debit.toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {tx.credit > 0 ? tx.credit.toLocaleString() : "—"}
                      </td>
                      {!account.is_group && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {tx.balance?.toLocaleString() ?? "—"}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {transactionsMeta && transactionsMeta.last_page > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {transactionsMeta.current_page} of {transactionsMeta.last_page}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(transactionsMeta.last_page, p + 1))}
                  disabled={page === transactionsMeta.last_page}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

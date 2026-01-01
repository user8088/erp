"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download } from "lucide-react";
import { accountsApi } from "../../../lib/apiClient";
import type { Account, Transaction, Paginated } from "../../../lib/types";
import { useToast } from "../../../components/ui/ToastProvider";
import { useUser } from "../../../components/User/UserContext";
import DeleteAccountModal from "../../../components/Accounting/DeleteAccountModal";

interface AccountDetailClientProps {
  id: string;
}

// Helper to get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th'; // 11th, 12th, 13th, etc.
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Helper to format transaction date (YYYY-MM-DD format) to readable format
const formatTransactionDate = (dateString: string | undefined): string => {
  if (!dateString) return '—';
  
  try {
    // Parse YYYY-MM-DD format
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}${suffix} ${month} ${year}`;
  } catch {
    return dateString; // Fallback to original if parsing fails
  }
};

// Helper to format date in readable format (with time)
const formatReadableDate = (isoString: string | undefined): { date: string; time: string; fullTimestamp: string } | null => {
  if (!isoString) return null;
  
  try {
    const date = new Date(isoString);
    
    // Format date: "27th October 2025"
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    // Format time: "2:30:45 pm" (with seconds)
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    
    return {
      date: `${day}${suffix} ${month} ${year}`,
      time: `${displayHours}:${minutes}:${seconds} ${ampm}`,
      fullTimestamp: `${day}${suffix} ${month} ${year} at ${displayHours}:${minutes}:${seconds} ${ampm}`
    };
  } catch {
    return null;
  }
};

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
  const [transactionsTotals, setTransactionsTotals] = useState<{ total_debit: number; total_credit: number; net_change: number; page_total_debit?: number; page_total_credit?: number } | null>(null);
  const [page, setPage] = useState(1);
  const [excludeOpeningBalances, setExcludeOpeningBalances] = useState(false);
  const [openingBalancesOnly, setOpeningBalancesOnly] = useState(false);

  // Balance State
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      const res = await accountsApi.getAccountTransactions(Number(id), { 
        page, 
        per_page: 20,
        sort_direction: 'desc', // Show latest entries first
        exclude_opening_balances: excludeOpeningBalances,
        opening_balances_only: openingBalancesOnly,
      });
      
      // Sort transactions to ensure latest are on top (fallback if backend doesn't sort)
      // Sort by date (desc), then created_at (desc), then id (desc)
      const sortedTransactions = [...res.data].sort((a, b) => {
        // First compare by date
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (dateB !== dateA) {
          return dateB - dateA; // Descending: newer dates first
        }
        
        // If dates are equal, compare by created_at
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (createdB !== createdA) {
          return createdB - createdA; // Descending: newer timestamps first
        }
        
        // If timestamps are equal, compare by id (descending)
        return (b.id || 0) - (a.id || 0);
      });
      
      setTransactions(sortedTransactions);
      setTransactionsMeta(res.meta);
      // Set totals if provided by backend, otherwise calculate from current page
      // Always recalculate to exclude net-zero transactions (where both debit and credit are non-zero)
      const validTransactions = sortedTransactions.filter(tx => {
        // Exclude transactions where both debit and credit are non-zero (net-zero transactions)
        return !((tx.debit || 0) > 0 && (tx.credit || 0) > 0);
      });
      
      const recalculatedDebit = validTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
      const recalculatedCredit = validTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
      
      // Use recalculated values to ensure accuracy (excludes net-zero transactions)
      setTransactionsTotals({
        total_debit: recalculatedDebit,
        total_credit: recalculatedCredit,
        net_change: recalculatedDebit - recalculatedCredit,
        page_total_debit: recalculatedDebit,
        page_total_credit: recalculatedCredit,
      });
      
      // Check if backend provided totals (for reference, but we use recalculated values)
      if ((res as unknown as { totals: typeof transactionsTotals }).totals) {
        // Backend totals are available but we use our recalculated values to ensure net-zero transactions are excluded
      } else {
        // Fallback: calculate from current page, excluding net-zero transactions
        // Filter out transactions where both debit and credit are non-zero
        const validTransactions = sortedTransactions.filter(tx => {
          // Exclude transactions where both debit and credit are non-zero (net-zero transactions)
          return !((tx.debit || 0) > 0 && (tx.credit || 0) > 0);
        });
        
        const totalDebit = validTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
        const totalCredit = validTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
        setTransactionsTotals({
          total_debit: totalDebit,
          total_credit: totalCredit,
          net_change: totalDebit - totalCredit,
          page_total_debit: totalDebit,
          page_total_credit: totalCredit,
        });
      }
    } catch (e) {
      console.error("Failed to load transactions", e);
      // We don't block the UI if transactions fail, just show empty or error state in that section
    } finally {
      setLoadingTransactions(false);
    }
  }, [id, page, excludeOpeningBalances, openingBalancesOnly]);

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

  const handleAccountDeleted = () => {
    addToast("Account deleted successfully.", "success");
    router.push("/chart-of-accounts");
  };

  const handleDownloadStatement = useCallback(async () => {
    if (!account) return;
    
    try {
      const blob = await accountsApi.downloadAccountStatement(Number(id));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const accountName = account.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `account-statement-${accountName}-${account.number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("Account statement downloaded successfully", "success");
    } catch (error) {
      console.error("Failed to download account statement:", error);
      addToast("Failed to download account statement", "error");
    }
  }, [account, id, addToast]);

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
            <>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all shadow-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => router.push("/journal-entry/new")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
              >
                + New Entry
              </button>
            </>
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
          <div className="flex items-center gap-3">
            {/* Opening Balance Filters */}
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeOpeningBalances}
                  onChange={(e) => {
                    setExcludeOpeningBalances(e.target.checked);
                    setOpeningBalancesOnly(false); // Uncheck other filter
                    setPage(1); // Reset to first page
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Exclude Opening Balances</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openingBalancesOnly}
                  onChange={(e) => {
                    setOpeningBalancesOnly(e.target.checked);
                    setExcludeOpeningBalances(false); // Uncheck other filter
                    setPage(1); // Reset to first page
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Opening Balances Only</span>
              </label>
            </div>
            <button
              onClick={handleDownloadStatement}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download E-Statement
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
                  {account.is_group && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  )}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance{account.is_group ? ' (All Child Accounts)' : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingTransactions ? (
                  <tr>
                    <td colSpan={account.is_group ? 9 : 8} className="px-4 py-12 text-center text-sm text-gray-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={account.is_group ? 9 : 8} className="px-4 py-12 text-center text-sm text-gray-500">
                      No transactions found for this period.
                    </td>
                  </tr>
                ) : (
                  <>
                    {transactions.map((tx) => {
                      const isOpeningBalance = tx.voucher_type === "Opening Balance" || tx.is_opening_balance;
                      return (
                      <tr 
                        key={tx.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          isOpeningBalance ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatTransactionDate(tx.date)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {isOpeningBalance && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                Opening Balance
                              </span>
                            )}
                            <span className={`${isOpeningBalance ? 'text-amber-700 font-medium' : 'text-blue-600'} hover:underline cursor-pointer`}>
                              {tx.voucher_type} {tx.reference_number ? `#${tx.reference_number}` : ''}
                            </span>
                          </div>
                        </td>
                        {account.is_group && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.related_account_name || tx.related_account_number || "—"}
                          </td>
                        )}
                        <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={tx.description || ""}>
                          {tx.description || "—"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600" title={tx.created_at || tx.entry_datetime || ''}>
                          {(() => {
                            // Try created_at first, then entry_datetime, then created_at from metadata
                            const timestamp = tx.created_at || tx.entry_datetime || (tx as { created_at: string }).created_at;
                            const formatted = formatReadableDate(timestamp);
                            if (!formatted) {
                              // Fallback: try to parse entry_date and entry_time if available
                              if (tx.entry_date && tx.entry_time) {
                                try {
                                  const dateTime = `${tx.entry_date} ${tx.entry_time}`;
                                  const parsed = formatReadableDate(dateTime);
                                  if (parsed) return (
                                    <div className="flex flex-col">
                                      <span>{parsed.date}</span>
                                      <span className="text-xs text-gray-500">{parsed.time}</span>
                                    </div>
                                  );
                                } catch {
                                  // Fall through to return dash
                                }
                              }
                              return <span className="text-gray-400">—</span>;
                            }
                            return (
                              <div className="flex flex-col">
                                <span>{formatted.date}</span>
                                <span className="text-xs text-gray-500 font-mono">{formatted.time}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {tx.creator?.full_name ? (
                            <span className="text-gray-900">{tx.creator.full_name}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {tx.debit !== undefined && tx.debit !== null ? (
                            <span>
                              {account.currency || "PKR"} {tx.debit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {tx.credit !== undefined && tx.credit !== null ? (
                            <span>
                              {account.currency || "PKR"} {tx.credit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {(() => {
                            if (account.is_group) {
                              // For group accounts, calculate cumulative balance of all child accounts
                              // Transactions are sorted desc (newest first), so we need to get all transactions
                              // from the oldest up to and including this one
                              const currentIndex = transactions.findIndex(t => t.id === tx.id);
                              
                              // Get all transactions from current index to end (these are older transactions in desc order)
                              // Then reverse to get chronological order (oldest to newest)
                              const transactionsUpToHere = transactions.slice(currentIndex);
                              const chronologicalTransactions = [...transactionsUpToHere].reverse();
                              
                              // Track balance per child account (using account name/number as key)
                              const childBalances: Record<string, number> = {};
                              
                              chronologicalTransactions.forEach((t) => {
                                const accountKey = t.related_account_name || t.related_account_number || 'unknown';
                                if (!(accountKey in childBalances)) {
                                  childBalances[accountKey] = 0;
                                }
                                // Calculate net effect (debit - credit)
                                // Note: This is simplified - ideally backend should provide balance considering normal_balance
                                const netEffect = (t.debit || 0) - (t.credit || 0);
                                childBalances[accountKey] += netEffect;
                              });
                              
                              // Sum all child account balances
                              const groupBalance = Object.values(childBalances).reduce((sum, bal) => sum + bal, 0);
                              
                              return (
                                <span>
                                  {account.currency || "PKR"} {groupBalance.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              );
                            } else {
                              // For ledger accounts, use the balance from transaction
                              return tx.balance !== undefined && tx.balance !== null ? (
                                <span>
                                  {account.currency || "PKR"} {tx.balance.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              );
                            }
                          })()}
                        </td>
                      </tr>
                    );
                    })}
                    {/* Totals Row */}
                    {transactions.length > 0 && transactionsTotals && (() => {
                      // Recalculate totals excluding net-zero transactions (where both debit and credit are non-zero)
                      const validTransactions = transactions.filter(tx => {
                        return !((tx.debit || 0) > 0 && (tx.credit || 0) > 0);
                      });
                      
                      // Check if there are any net-zero transactions to warn about
                      const netZeroTransactions = transactions.filter(tx => {
                        return (tx.debit || 0) > 0 && (tx.credit || 0) > 0;
                      });
                      
                      // Use recalculated totals (excluding net-zero transactions)
                      const displayTotalDebit = validTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
                      const displayTotalCredit = validTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
                      const displayNetChange = displayTotalDebit - displayTotalCredit;
                      
                      return (
                        <>
                          {netZeroTransactions.length > 0 && (
                            <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                              <td colSpan={account.is_group ? 9 : 8} className="px-4 py-2 text-xs text-yellow-800">
                                ⚠️ Warning: {netZeroTransactions.length} transaction(s) with both debit and credit amounts detected. These have been excluded from totals to prevent discrepancies.
                              </td>
                            </tr>
                          )}
                          <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                            <td colSpan={account.is_group ? 6 : 5} className="px-4 py-4 text-sm text-gray-900 text-right">
                              <span className="font-bold">Total{transactionsMeta && transactionsMeta.last_page > 1 ? ' (This Page)' : ''}:</span>
                            </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                            {account.currency || "PKR"} {displayTotalDebit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                            {account.currency || "PKR"} {displayTotalCredit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                            {account.is_group ? (
                              // For group accounts, show cumulative balance of all child accounts
                              <span>
                                {account.currency || "PKR"} {(() => {
                                  // Calculate total balance of all child accounts from valid transactions
                                  const validTransactions = transactions.filter(tx => {
                                    return !((tx.debit || 0) > 0 && (tx.credit || 0) > 0);
                                  });
                                  
                                  // Process in chronological order (oldest to newest)
                                  const chronologicalTransactions = [...validTransactions].reverse();
                                  const childBalances: Record<string, number> = {};
                                  
                                  chronologicalTransactions.forEach((t) => {
                                    const accountKey = t.related_account_name || t.related_account_number || 'unknown';
                                    if (!(accountKey in childBalances)) {
                                      childBalances[accountKey] = 0;
                                    }
                                    const netEffect = (t.debit || 0) - (t.credit || 0);
                                    childBalances[accountKey] += netEffect;
                                  });
                                  
                                  const totalGroupBalance = Object.values(childBalances).reduce((sum, bal) => sum + bal, 0);
                                  return totalGroupBalance.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  });
                                })()}
                              </span>
                            ) : (
                              // For ledger accounts, show net change
                              <span className={displayNetChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {displayNetChange >= 0 ? '+' : ''}{account.currency || "PKR"} {Math.abs(displayNetChange).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            )}
                          </td>
                        </tr>
                        </>
                      );
                    })()}
                  </>
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

        {/* Totals Explanation */}
        {transactions.length > 0 && transactionsTotals && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Understanding the Totals</h3>
            <div className="text-sm text-blue-800 space-y-2">
              {transactionsMeta && transactionsMeta.last_page > 1 && transactionsTotals.total_debit !== transactionsTotals.page_total_debit && (
                <div className="bg-blue-100 border border-blue-300 rounded p-2 mb-2">
                  <p className="font-medium">All Transactions (All Pages):</p>
                  <p className="text-xs mt-1">
                    Total Debit: {account.currency || "PKR"} {transactionsTotals.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2 })} | 
                    Total Credit: {account.currency || "PKR"} {transactionsTotals.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2 })} | 
                    Net Change: {account.currency || "PKR"} {transactionsTotals.net_change.toLocaleString(undefined, { minimumFractionDigits: 2, signDisplay: 'always' })}
                  </p>
                </div>
              )}
              {account.is_group ? (
                <>
                  <p>
                    <strong>Total Debit:</strong> Sum of all debit amounts{transactionsMeta && transactionsMeta.last_page > 1 ? ' on this page' : ''} across all child accounts in this group.
                  </p>
                  <p>
                    <strong>Total Credit:</strong> Sum of all credit amounts{transactionsMeta && transactionsMeta.last_page > 1 ? ' on this page' : ''} across all child accounts in this group.
                  </p>
                  <p className="mt-2 pt-2 border-t border-blue-300">
                    <strong>Note:</strong> For group accounts, totals represent the aggregate sum across all child accounts{transactionsMeta && transactionsMeta.last_page > 1 ? ' shown on this page' : ''}. 
                    Since group accounts can contain both debit-normal and credit-normal child accounts, the net effect on the group balance depends on the individual account types.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Total Debit:</strong> Sum of all debit amounts{transactionsMeta && transactionsMeta.last_page > 1 ? ' on this page' : ''}. 
                    {account.normal_balance === 'debit' 
                      ? ' For this account (debit normal), debits increase the balance.'
                      : ' For this account (credit normal), debits decrease the balance.'}
                  </p>
                  <p>
                    <strong>Total Credit:</strong> Sum of all credit amounts{transactionsMeta && transactionsMeta.last_page > 1 ? ' on this page' : ''}.
                    {account.normal_balance === 'credit'
                      ? ' For this account (credit normal), credits increase the balance.'
                      : ' For this account (debit normal), credits decrease the balance.'}
                  </p>
                  <p className="mt-2 pt-2 border-t border-blue-300">
                    <strong>Net Change:</strong> The difference between total debits and credits{transactionsMeta && transactionsMeta.last_page > 1 ? ' on this page' : ''}. 
                    This shows the net effect of {transactionsMeta && transactionsMeta.last_page > 1 ? 'the displayed' : 'all'} transactions on the account balance.
                    {account.normal_balance === 'debit' 
                      ? ' Positive values increase the balance; negative values decrease it.'
                      : ' Positive values decrease the balance; negative values increase it (for credit normal accounts).'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && account && (
        <DeleteAccountModal
          account={account}
          balance={balance}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleAccountDeleted}
        />
      )}
    </div>
  );
}

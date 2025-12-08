"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Settings2, Sparkles } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import { stockApi, accountsApi } from "../../lib/apiClient";
import type { Account } from "../../lib/types";

interface AccountMapping {
  inventory_account_id: number | null;
  accounts_payable_account_id: number | null;
}

export default function StockSettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingAutoDetect, setLoadingAutoDetect] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mappings, setMappings] = useState<AccountMapping>({
    inventory_account_id: null,
    accounts_payable_account_id: null,
  });

  // Fetch accounts from Chart of Accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await accountsApi.getAccounts({ 
          company_id: 1, 
          per_page: 1000,
          is_group: false // Only get ledger accounts, not groups
        });
        setAccounts(response.data);
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
        addToast("Failed to load accounts", "error");
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [addToast]);

  // Fetch current mappings
  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const response = await stockApi.getAccountMappings();
        if (response.mappings) {
          setMappings({
            inventory_account_id: response.mappings.inventory_account_id,
            accounts_payable_account_id: response.mappings.accounts_payable_account_id,
          });
        }
      } catch (error) {
        console.error("Failed to fetch mappings:", error);
      }
    };

    fetchMappings();
  }, []);

  const assetAccounts = accounts.filter(acc => acc.root_type === 'asset' && !acc.is_disabled);
  const liabilityAccounts = accounts.filter(acc => acc.root_type === 'liability' && !acc.is_disabled);

  const handleAutoDetect = async () => {
    setLoadingAutoDetect(true);
    try {
      const response = await stockApi.autoDetectAccounts();
      
      const detectedAccounts = response.detected_accounts;
      if (detectedAccounts?.inventory_account && detectedAccounts?.accounts_payable_account) {
        const inventoryAccount = detectedAccounts.inventory_account;
        const payableAccount = detectedAccounts.accounts_payable_account;
        
        setMappings({
          inventory_account_id: inventoryAccount.id,
          accounts_payable_account_id: payableAccount.id,
        });
        
        addToast(
          `Auto-detected with ${response.confidence || 'high'} confidence: ${inventoryAccount.name} & ${payableAccount.name}`,
          "success"
        );
      } else {
        addToast(response?.message || "Could not auto-detect accounts", "info");
        
        if (response?.suggestions && response.suggestions.length > 0) {
          console.log("Suggestions:", response.suggestions);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to auto-detect accounts";
      addToast(errorMessage, "error");
    } finally {
      setLoadingAutoDetect(false);
    }
  };

  const handleSave = async () => {
    if (!mappings.inventory_account_id) {
      addToast("Please select an Inventory account", "error");
      return;
    }

    if (!mappings.accounts_payable_account_id) {
      addToast("Please select an Accounts Payable account", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await stockApi.saveAccountMappings({
        inventory_account_id: mappings.inventory_account_id,
        accounts_payable_account_id: mappings.accounts_payable_account_id,
      });
      
      addToast(response.message || "Account mappings saved successfully", "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings";
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/stock")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stock Management
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Settings2 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Order Accounting Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure which accounts to use for purchase order accounting entries
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📘 How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• When you <strong>receive stock</strong> from a purchase order, a journal entry is created</li>
          <li>• <strong>Inventory account</strong> is debited (your assets increase)</li>
          <li>• <strong>Accounts Payable</strong> is credited (you owe the supplier)</li>
          <li>• When you <strong>pay the supplier</strong>, another entry reduces both payable and cash</li>
        </ul>
      </div>

      {/* Auto-Detect Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAutoDetect}
          disabled={loadingAutoDetect || loadingAccounts}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {loadingAutoDetect ? "Detecting..." : "Auto-Detect Accounts"}
        </button>
      </div>

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account Mappings</h2>
        
        <div className="space-y-6">
          {/* Inventory Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inventory Account <span className="text-red-500">*</span>
            </label>
            <select
              value={mappings.inventory_account_id || ""}
              onChange={(e) => setMappings({ ...mappings, inventory_account_id: Number(e.target.value) })}
              disabled={loadingAccounts}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">{loadingAccounts ? "Loading accounts..." : "Select an account"}</option>
              {assetAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number ? `${account.number} - ` : ""}{account.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This account will be <strong>debited</strong> when stock is received (Asset increases)
            </p>
            {assetAccounts.length === 0 && !loadingAccounts && (
              <p className="mt-1 text-xs text-red-500">
                No asset accounts found. Please create an Inventory account in Chart of Accounts.
              </p>
            )}
          </div>

          {/* Accounts Payable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accounts Payable <span className="text-red-500">*</span>
            </label>
            <select
              value={mappings.accounts_payable_account_id || ""}
              onChange={(e) => setMappings({ ...mappings, accounts_payable_account_id: Number(e.target.value) })}
              disabled={loadingAccounts}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">{loadingAccounts ? "Loading accounts..." : "Select an account"}</option>
              {liabilityAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number ? `${account.number} - ` : ""}{account.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This account will be <strong>credited</strong> when stock is received (Liability increases)
            </p>
            {liabilityAccounts.length === 0 && !loadingAccounts && (
              <p className="mt-1 text-xs text-red-500">
                No liability accounts found. Please create an Accounts Payable account in Chart of Accounts.
              </p>
            )}
          </div>
        </div>

        {/* Example Entry */}
        {mappings.inventory_account_id && mappings.accounts_payable_account_id && !loadingAccounts && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Example Journal Entry:</h3>
            <p className="text-xs text-gray-600 mb-2">When receiving PKR 50,000 worth of stock:</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Account</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Debit</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-3 py-2 text-gray-900">
                      {accounts.find(a => a.id === mappings.inventory_account_id)?.name || "Inventory Account"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">50,000</td>
                    <td className="px-3 py-2 text-right text-gray-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-gray-900">
                      {accounts.find(a => a.id === mappings.accounts_payable_account_id)?.name || "Accounts Payable"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400">—</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">50,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/stock")}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !mappings.inventory_account_id || !mappings.accounts_payable_account_id || loadingAccounts}
          className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

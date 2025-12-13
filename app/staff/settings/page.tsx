"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Settings2 } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import { accountMappingsApi, accountsApi } from "../../lib/apiClient";
import type { Account, AccountMappingStatus } from "../../lib/types";

const MAPPING_TYPES = [
  { 
    type: 'staff_salary_expense', 
    label: 'Salary Expense Account', 
    description: 'Account to debit when salary is paid (Expense account - e.g., "Salaries & Wages")',
    required: true,
    accountType: 'expense'
  },
  { 
    type: 'staff_salary_payment', 
    label: 'Salary Payment Account', 
    description: 'Account to credit when salary is paid (Asset account - e.g., "Cash" or "Bank Account")',
    required: true,
    accountType: 'asset'
  },
] as const;

export default function StaffSettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mappingStatus, setMappingStatus] = useState<AccountMappingStatus[]>([]);
  const [mappings, setMappings] = useState<Record<string, number | null>>({});

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
        
        if (response.data && Array.isArray(response.data)) {
          setAccounts(response.data);
        } else {
          console.error("[Staff Settings] Invalid response structure:", response);
        }
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
      setLoadingMappings(true);
      try {
        const statusResponse = await accountMappingsApi.getAccountMappingStatus();
        
        if (statusResponse.data) {
          setMappingStatus(statusResponse.data);
          
          // Build mappings object from status
          const mappingsObj: Record<string, number | null> = {};
          statusResponse.data.forEach((status) => {
            if (status.account_id) {
              mappingsObj[status.mapping_type] = status.account_id;
            }
          });
          setMappings(mappingsObj);
        }
      } catch (error) {
        console.error("Failed to fetch mappings:", error);
      } finally {
        setLoadingMappings(false);
      }
    };

    fetchMappings();
  }, []);

  const getMappingStatus = (mappingType: string): AccountMappingStatus | undefined => {
    return mappingStatus.find((s) => s.mapping_type === mappingType);
  };

  const getAvailableAccounts = (accountType: string): Account[] => {
    return accounts.filter(
      (acc) => acc.root_type === accountType && !acc.is_disabled
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete existing mappings first
      const existingMappings = mappingStatus
        .filter((s) => s.is_configured && MAPPING_TYPES.some((mt) => mt.type === s.mapping_type))
        .map((s) => s.mapping_type);
      
      for (const mappingType of existingMappings) {
        const status = getMappingStatus(mappingType);
        if (status?.account_id) {
          try {
            // Find the mapping ID from the account mappings list
            const allMappings = await accountMappingsApi.getAccountMappings();
            const mappingToDelete = allMappings.data?.find(
              (m) => m.mapping_type === mappingType
            );
            if (mappingToDelete?.id) {
              await accountMappingsApi.deleteAccountMapping(mappingToDelete.id);
            }
          } catch (error) {
            console.error(`Failed to delete mapping ${mappingType}:`, error);
          }
        }
      }

      // Create new mappings
      for (const mappingType of MAPPING_TYPES) {
        const accountId = mappings[mappingType.type];
        if (accountId) {
          await accountMappingsApi.createAccountMapping({
            mapping_type: mappingType.type as 'staff_salary_expense' | 'staff_salary_payment',
            account_id: accountId,
            company_id: 1,
          });
        }
      }

      addToast("Account mappings saved successfully", "success");
      
      // Reload mappings
      const statusResponse = await accountMappingsApi.getAccountMappingStatus();
      if (statusResponse.data) {
        setMappingStatus(statusResponse.data);
        const mappingsObj: Record<string, number | null> = {};
        statusResponse.data.forEach((status) => {
          if (status.account_id) {
            mappingsObj[status.mapping_type] = status.account_id;
          }
        });
        setMappings(mappingsObj);
      }
    } catch (error) {
      console.error("Failed to save mappings:", error);
      addToast("Failed to save account mappings", "error");
    } finally {
      setLoading(false);
    }
  };

  const allRequiredMapped = MAPPING_TYPES.every(
    (mt) => !mt.required || mappings[mt.type]
  );

  return (
    <div className="max-w-4xl mx-auto min-h-full px-2 md:px-0">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Staff Settings</h1>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These account mappings are required to pay staff salaries. 
          When salary is paid, journal entries will be automatically created using these accounts.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account Mappings</h2>
        
        {loadingMappings ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Loading account mappings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {MAPPING_TYPES.map((mappingType) => {
              const status = getMappingStatus(mappingType.type);
              const availableAccounts = getAvailableAccounts(mappingType.accountType);
              const isConfigured = status?.is_configured || false;
              const currentValue = mappings[mappingType.type] || "";

              return (
                <div key={mappingType.type}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {mappingType.label}
                    {mappingType.required && <span className="text-red-500 ml-1">*</span>}
                    {isConfigured && (
                      <span className="ml-2 text-xs text-green-600 font-normal">
                        (Configured)
                      </span>
                    )}
                  </label>
                  <select
                    value={currentValue}
                    onChange={(e) => {
                      setMappings({
                        ...mappings,
                        [mappingType.type]: e.target.value ? Number(e.target.value) : null,
                      });
                    }}
                    disabled={loadingAccounts}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      mappingType.required && !mappings[mappingType.type]
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">
                      {loadingAccounts ? "Loading accounts..." : "Select an account"}
                    </option>
                    {availableAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.number ? `${account.number} - ` : ""}{account.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {mappingType.description}
                  </p>
                  {availableAccounts.length === 0 && !loadingAccounts && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      No {mappingType.accountType} accounts found. Please create accounts in Chart of Accounts first.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || loadingMappings || loadingAccounts || !allRequiredMapped}
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Mappings"}
        </button>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Settings2 } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import { accountMappingsApi, accountsApi } from "../../lib/apiClient";
import type { Account, AccountMappingStatus } from "../../lib/types";

const MAPPING_TYPES = [
  { 
    type: 'pos_sales_revenue', 
    label: 'Sales Revenue', 
    description: 'Account to credit when sales are made (Revenue account)',
    required: true,
    accountType: 'income'
  },
  { 
    type: 'pos_cash', 
    label: 'Cash in Hand', 
    description: 'Account to debit for cash payments (Asset account)',
    required: true,
    accountType: 'asset'
  },
  { 
    type: 'pos_bank', 
    label: 'Bank Account', 
    description: 'Account to debit for bank/transfer payments (Asset account)',
    required: false,
    accountType: 'asset'
  },
  { 
    type: 'pos_ar', 
    label: 'Accounts Receivable', 
    description: 'Account to debit for unpaid sales (Asset account)',
    required: true,
    accountType: 'asset'
  },
  { 
    type: 'pos_advance', 
    label: 'Customer Advances', 
    description: 'Account to credit for customer advance payments (Liability account)',
    required: true,
    accountType: 'liability'
  },
  { 
    type: 'pos_delivery_revenue', 
    label: 'Delivery Charges Revenue', 
    description: 'Account to credit for delivery charges (Revenue account)',
    required: false,
    accountType: 'income'
  },
  { 
    type: 'pos_discount', 
    label: 'Discounts Given', 
    description: 'Account to debit for discounts (Contra Revenue account)',
    required: false,
    accountType: 'expense'
  },
] as const;

export default function SellingSettingsPage() {
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
        
        console.log("[POS Settings] Accounts API response:", response);
        console.log("[POS Settings] Accounts data:", response.data);
        console.log("[POS Settings] Total accounts:", response.data?.length || 0);
        
        if (response.data && Array.isArray(response.data)) {
          setAccounts(response.data);
          console.log("[POS Settings] Accounts loaded:", response.data.length);
          
          // Log account types breakdown
          const typeBreakdown = response.data.reduce((acc: Record<string, number>, account) => {
            const type = account.root_type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});
          console.log("[POS Settings] Account types breakdown:", typeBreakdown);
        } else {
          console.error("[POS Settings] Invalid response structure:", response);
          addToast("Invalid response from accounts API", "error");
        }
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
        addToast("Failed to load accounts. Please check your Chart of Accounts.", "error");
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [addToast]);

  // Fetch current mapping status
  useEffect(() => {
    const fetchMappingStatus = async () => {
      setLoadingMappings(true);
      try {
        const response = await accountMappingsApi.getAccountMappingStatus();
        setMappingStatus(response.data);
        
        // Initialize mappings state
        const initialMappings: Record<string, number | null> = {};
        response.data.forEach((status) => {
          initialMappings[status.mapping_type] = status.account_id || null;
        });
        setMappings(initialMappings);
      } catch (error) {
        console.error("Failed to fetch mapping status:", error);
        addToast("Failed to load account mappings", "error");
      } finally {
        setLoadingMappings(false);
      }
    };

    fetchMappingStatus();
  }, [addToast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Get existing mappings to update/delete
      const existingMappings = await accountMappingsApi.getAccountMappings();
      const existingMap = new Map(existingMappings.data.map(m => [m.mapping_type, m.id]));

      // Save all mappings
      const savePromises = MAPPING_TYPES.map(async (mappingType) => {
        const accountId = mappings[mappingType.type];
        
        if (!accountId) {
          // Delete mapping if it exists and user cleared it
          if (existingMap.has(mappingType.type)) {
            const mappingId = existingMap.get(mappingType.type)!;
            await accountMappingsApi.deleteAccountMapping(mappingId);
          }
          return;
        }

        // Create or update mapping
        await accountMappingsApi.createAccountMapping({
          mapping_type: mappingType.type,
          account_id: accountId,
          company_id: null,
        });
      });

      await Promise.all(savePromises);

      addToast("Account mappings saved successfully!", "success");
      
      // Refresh mapping status
      const response = await accountMappingsApi.getAccountMappingStatus();
      setMappingStatus(response.data);
    } catch (error) {
      console.error("Failed to save mappings:", error);
      addToast("Failed to save account mappings", "error");
    } finally {
      setLoading(false);
    }
  };

  const getAccountsForType = (accountType: string) => {
    switch (accountType) {
      case 'asset':
        return accounts.filter(acc => acc.root_type === 'asset' && !acc.is_disabled);
      case 'liability':
        return accounts.filter(acc => acc.root_type === 'liability' && !acc.is_disabled);
      case 'income':
        return accounts.filter(acc => acc.root_type === 'income' && !acc.is_disabled);
      case 'expense':
        return accounts.filter(acc => acc.root_type === 'expense' && !acc.is_disabled);
      default:
        return accounts.filter(acc => !acc.is_disabled);
    }
  };

  const getMappingStatus = (mappingType: string) => {
    return mappingStatus.find(m => m.mapping_type === mappingType);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Settings2 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">POS Account Mappings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure Chart of Accounts mappings for Point of Sale operations
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These account mappings are required for POS operations. 
          When sales are processed, journal entries will be automatically created using these accounts.
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
              const availableAccounts = getAccountsForType(mappingType.accountType);
              
              // Debug logging for troubleshooting
              if (mappingType.type === 'pos_discount' || availableAccounts.length === 0) {
                console.log(`[POS Settings] ${mappingType.label} - Account Type: ${mappingType.accountType}`);
                console.log(`[POS Settings] Total accounts loaded: ${accounts.length}`);
                console.log(`[POS Settings] Available accounts for ${mappingType.accountType}:`, availableAccounts.length);
              }
              
              return (
                <div key={mappingType.type}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {mappingType.label}
                    {mappingType.required && <span className="text-red-500 ml-1">*</span>}
                    {status?.is_configured && (
                      <span className="ml-2 text-xs text-green-600 font-normal">✓ Configured</span>
                    )}
                  </label>
                  <select
                    value={mappings[mappingType.type] || ""}
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
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <p className="text-yellow-800 font-medium mb-1">
                        No {mappingType.accountType} accounts found.
                      </p>
                      <p className="text-yellow-700">
                        {accounts.length === 0 
                          ? "No accounts found in Chart of Accounts. Please create accounts first."
                          : `Found ${accounts.length} total accounts, but none are ${mappingType.accountType} type. Please create ${mappingType.accountType} accounts in Chart of Accounts.`
                        }
                      </p>
                      {accounts.length > 0 && (
                        <p className="text-yellow-600 mt-1">
                          Available account types: {Object.keys(accounts.reduce((acc: Record<string, boolean>, a) => {
                            acc[a.root_type] = true;
                            return acc;
                          }, {})).join(", ")}
                        </p>
                      )}
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
          disabled={loading || loadingAccounts || loadingMappings}
          className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Mappings"}
        </button>
      </div>
    </div>
  );
}


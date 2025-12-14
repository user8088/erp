"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { accountsApi } from "../../lib/apiClient";
import type { Account } from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

interface Shortcut {
  label: string;
  href?: string;
  onClick?: () => void;
  isAccountsPayable?: boolean;
}

export default function PayablesShortcuts() {
  const router = useRouter();
  const { addToast } = useToast();
  const [accountsPayableAccountId, setAccountsPayableAccountId] = useState<number | null>(null);
  const [loadingAccountsPayable, setLoadingAccountsPayable] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);

  // Load or find Accounts Payable account ID
  useEffect(() => {
    const loadAccountsPayableAccount = async () => {
      // Check localStorage first
      const storedId = localStorage.getItem('accounts_payable_account_id');
      if (storedId) {
        setAccountsPayableAccountId(Number(storedId));
        return;
      }

      // Try to find account by name
      setLoadingAccountsPayable(true);
      try {
        // First try searching for "Accounts Payable"
        const searchResponse = await accountsApi.getAccounts({
          company_id: 1,
          search: 'Accounts Payable',
          per_page: 100,
          is_group: false,
        });

        // Look for exact or similar match (case-insensitive)
        const exactMatch = searchResponse.data.find(acc => {
          const nameLower = acc.name.toLowerCase();
          return nameLower === 'accounts payable' || nameLower.includes('accounts payable');
        });

        if (exactMatch) {
          localStorage.setItem('accounts_payable_account_id', String(exactMatch.id));
          setAccountsPayableAccountId(exactMatch.id);
          setLoadingAccountsPayable(false);
          return;
        }

        // No exact match found, get all liability accounts for selection
        const liabilityResponse = await accountsApi.getAccounts({
          company_id: 1,
          root_type: 'liability',
          is_group: false,
          per_page: 200,
        });
        
        if (liabilityResponse.data.length > 0) {
          setAvailableAccounts(liabilityResponse.data);
        }
      } catch (error) {
        console.error("Failed to find Accounts Payable account:", error);
      } finally {
        setLoadingAccountsPayable(false);
      }
    };

    void loadAccountsPayableAccount();
  }, []);

  const handleAccountsPayableClick = () => {
    if (accountsPayableAccountId) {
      router.push(`/accounting/accounts/${accountsPayableAccountId}`);
    } else if (availableAccounts.length > 0) {
      // Show modal to let user select the account
      setShowAccountSelector(true);
    } else {
      // Navigate to chart of accounts to let user find it
      router.push('/chart-of-accounts');
      addToast("Please search for and select the Accounts Payable account from Chart of Accounts", "info");
    }
  };

  const handleAccountSelect = (accountId: number) => {
    localStorage.setItem('accounts_payable_account_id', String(accountId));
    setAccountsPayableAccountId(accountId);
    setShowAccountSelector(false);
    router.push(`/accounting/accounts/${accountId}`);
  };

  const shortcuts: Shortcut[] = [
    { label: "Purchase Invoice", href: "/buying/purchase-invoices" },
    { label: "Supplier Invoices", href: "/supplier/invoices" },
    { label: "Suppliers", href: "/suppliers" },
    { label: "Purchase Orders", href: "/stock/purchase-orders/new" },
    { label: "Journal Entry", href: "/journal-entry/new" },
    { label: "Accounts Payable", onClick: handleAccountsPayableClick, isAccountsPayable: true },
  ];

  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Shortcuts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shortcuts.map((shortcut) => (
            shortcut.href ? (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors group"
              >
                <span className="text-sm text-gray-700">{shortcut.label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            ) : (
              <button
                key={shortcut.label}
                onClick={shortcut.onClick}
                disabled={loadingAccountsPayable}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm text-gray-700">{shortcut.label}</span>
                {loadingAccountsPayable ? (
                  <span className="text-xs text-gray-500">Loading...</span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </button>
            )
          ))}
        </div>
      </section>

      {/* Account Selector Modal */}
      {showAccountSelector && availableAccounts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Select Accounts Payable Account</h2>
                <p className="text-sm text-gray-500 mt-1">Please select which account in your Chart of Accounts represents Accounts Payable. This selection will be saved for future use.</p>
              </div>
              <button
                onClick={() => setShowAccountSelector(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors ml-4"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {availableAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-orange-300 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{account.name}</div>
                    {account.number && (
                      <div className="text-sm text-gray-500">Account #: {account.number}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowAccountSelector(false);
                  router.push('/chart-of-accounts');
                  addToast("Please search for and select the Accounts Payable account from Chart of Accounts", "info");
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Browse Chart of Accounts Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


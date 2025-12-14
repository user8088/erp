"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { accountsApi } from "../../lib/apiClient";
import type { Account } from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

const reports = {
  Invoicing: [
    { label: "Purchase Invoices", href: "/buying/purchase-invoices" },
    { label: "Supplier Invoices", href: "/supplier/invoices" },
    { label: "Suppliers", href: "/suppliers" },
  ],
  Payments: [
    { label: "Journal Entry", href: "/journal-entry/new" },
  ],
  Reports: [
    { label: "Accounts Payable", href: "/accounting/payables", isAccountsPayable: true },
  ],
};

export default function PayablesReports() {
  const router = useRouter();
  const { addToast } = useToast();
  const [accountsPayableAccountId, setAccountsPayableAccountId] = useState<number | null>(null);
  const [loadingAccountsPayable, setLoadingAccountsPayable] = useState(false);

  // Load Accounts Payable account ID from localStorage or search
  useEffect(() => {
    const loadAccountsPayableAccount = async () => {
      const storedId = localStorage.getItem('accounts_payable_account_id');
      if (storedId) {
        setAccountsPayableAccountId(Number(storedId));
        return;
      }

      // Try to find account by name
      setLoadingAccountsPayable(true);
      try {
        const response = await accountsApi.getAccounts({
          company_id: 1,
          search: 'Accounts Payable',
          per_page: 100,
          is_group: false,
        });

        const exactMatch = response.data.find(acc => 
          acc.name.toLowerCase() === 'accounts payable' || 
          acc.name.toLowerCase().includes('accounts payable')
        );

        if (exactMatch) {
          localStorage.setItem('accounts_payable_account_id', String(exactMatch.id));
          setAccountsPayableAccountId(exactMatch.id);
        }
      } catch (error) {
        console.error("Failed to find Accounts Payable account:", error);
      } finally {
        setLoadingAccountsPayable(false);
      }
    };

    void loadAccountsPayableAccount();
  }, []);

  const handleAccountsPayableClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (accountsPayableAccountId) {
      router.push(`/accounting/accounts/${accountsPayableAccountId}`);
    } else {
      // Navigate to chart of accounts to let user find it
      router.push('/chart-of-accounts');
      addToast("Please search for and select the Accounts Payable account", "info");
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Invoicing</h3>
          <ul className="space-y-1.5">
            {reports.Invoicing.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Payments</h3>
          <ul className="space-y-1.5">
            {reports.Payments.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Reports</h3>
          <ul className="space-y-1.5">
            {reports.Reports.map((item) => (
              <li key={item.href}>
                {item.isAccountsPayable ? (
                  <button
                    onClick={handleAccountsPayableClick}
                    disabled={loadingAccountsPayable}
                    className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1 disabled:opacity-50"
                  >
                    <span>{item.label}</span>
                    {loadingAccountsPayable ? (
                      <span className="text-xs">Loading...</span>
                    ) : (
                      <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href!}
                    className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}


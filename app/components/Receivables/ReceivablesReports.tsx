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
    { label: "Sale Invoices", href: "/selling/sale-invoices" },
    { label: "Customer Invoices", href: "/customer/invoices" },
    { label: "Customers", href: "/customer" },
  ],
  Rentals: [
    { label: "Rental Agreements", href: "/rental/agreements" },
  ],
  Payments: [
    { label: "Journal Entry", href: "/journal-entry/new" },
  ],
  Reports: [
    { label: "Accounts Receivable", href: "/accounting/receivables", isAccountsReceivable: true },
  ],
};

export default function ReceivablesReports() {
  const router = useRouter();
  const { addToast } = useToast();
  const [accountsReceivableAccountId, setAccountsReceivableAccountId] = useState<number | null>(null);
  const [loadingAccountsReceivable, setLoadingAccountsReceivable] = useState(false);

  // Load Accounts Receivable account ID from localStorage or search
  useEffect(() => {
    const loadAccountsReceivableAccount = async () => {
      const storedId = localStorage.getItem('accounts_receivable_account_id');
      if (storedId) {
        setAccountsReceivableAccountId(Number(storedId));
        return;
      }

      // Try to find account by name
      setLoadingAccountsReceivable(true);
      try {
        const response = await accountsApi.getAccounts({
          company_id: 1,
          search: 'Accounts Receivable',
          per_page: 100,
          is_group: false,
        });

        const exactMatch = response.data.find(acc => {
          const nameLower = acc.name.toLowerCase();
          return nameLower === 'accounts receivable' || nameLower.includes('accounts receivable');
        });

        if (exactMatch) {
          localStorage.setItem('accounts_receivable_account_id', String(exactMatch.id));
          setAccountsReceivableAccountId(exactMatch.id);
        }
      } catch (error) {
        console.error("Failed to find Accounts Receivable account:", error);
      } finally {
        setLoadingAccountsReceivable(false);
      }
    };

    void loadAccountsReceivableAccount();
  }, []);

  const handleAccountsReceivableClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (accountsReceivableAccountId) {
      router.push(`/accounting/accounts/${accountsReceivableAccountId}`);
    } else {
      // Navigate to chart of accounts to let user find it
      router.push('/chart-of-accounts');
      addToast("Please search for and select the Accounts Receivable account", "info");
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Rentals</h3>
          <ul className="space-y-1.5">
            {reports.Rentals.map((item) => (
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
                {item.isAccountsReceivable ? (
                  <button
                    onClick={handleAccountsReceivableClick}
                    disabled={loadingAccountsReceivable}
                    className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1 disabled:opacity-50"
                  >
                    <span>{item.label}</span>
                    {loadingAccountsReceivable ? (
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


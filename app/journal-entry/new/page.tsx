"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountsApi } from "../../lib/apiClient";
import type { Account } from "../../lib/types";
import JournalEntryForm from "../../components/Accounting/JournalEntryForm";
import { useUser } from "../../components/User/UserContext";

export default function NewJournalEntryPage() {
  const router = useRouter();
  const { hasAtLeast } = useUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const canWriteAccounting = hasAtLeast("module.accounting", "read-write");

  useEffect(() => {
    if (!canWriteAccounting) {
      router.push("/");
      return;
    }

    const loadAccounts = async () => {
      setLoading(true);
      try {
        // Load all accounts for the company (assuming company_id = 1)
        const res = await accountsApi.getAccounts({ company_id: 1, per_page: 1000 });
        setAccounts(res.data);
      } catch (e) {
        console.error("Failed to load accounts", e);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [canWriteAccounting, router]);

  if (!canWriteAccounting) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => router.push("/chart-of-accounts")} className="hover:text-gray-900 transition-colors">
            Accounting
          </button>
          <span>/</span>
          <span>New Journal Entry</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create Journal Entry</h1>
        <p className="text-gray-600 mt-1">Record a manual accounting transaction</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading accounts...</div>
        ) : (
          <JournalEntryForm
            accounts={accounts}
            onSuccess={() => {
              router.push("/chart-of-accounts");
            }}
            onCancel={() => {
              router.back();
            }}
          />
        )}
      </div>
    </div>
  );
}

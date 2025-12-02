"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountsApi } from "../../lib/apiClient";
import type { Account, Paginated, RootAccountType } from "../../lib/types";
import { useUser } from "../../components/User/UserContext";

type FilterState = {
  search: string;
  root_type: "" | RootAccountType;
  is_group: "" | "group" | "ledger";
};

export default function AccountsListPage() {
  const router = useRouter();
  const { hasAtLeast } = useUser();
  const canReadAccounting = hasAtLeast("module.accounting", "read");
  const canWriteAccounting = hasAtLeast("module.accounting", "read-write");

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    root_type: "",
    is_group: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Account> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canReadAccounting) {
    return (
      <div className="max-w-3xl mx-auto min-h-full py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Accounting Access Required
        </h1>
        <p className="text-sm text-gray-600">
          You don&apos;t have permission to view Accounts. Please contact your
          system administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await accountsApi.getAccounts({
          company_id: 1,
          search: filters.search || undefined,
          root_type: filters.root_type || undefined,
          is_group:
            filters.is_group === ""
              ? undefined
              : filters.is_group === "group"
              ? true
              : false,
          page,
          per_page: 20,
        });
        if (!cancelled) {
          setData(res);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load accounts list."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.root_type, filters.is_group, page]);

  const toggleDisabled = async (account: Account) => {
    if (!canWriteAccounting) return;
    try {
      const res = await accountsApi.updateAccountState(
        account.id,
        !account.is_disabled
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((a) =>
                a.id === account.id ? res.account : a
              ),
            }
          : prev
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto min-h-full py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Accounts</h1>
        <button
          type="button"
          onClick={() => router.push("/accounting/accounts/new")}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          New Account
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or number"
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <select
          value={filters.root_type}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              root_type: e.target.value as FilterState["root_type"],
            }))
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="equity">Equity</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={filters.is_group}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              is_group: e.target.value as FilterState["is_group"],
            }))
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">All Accounts</option>
          <option value="group">Groups only</option>
          <option value="ledger">Ledgers only</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
        {loading && !data && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading accounts...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Number
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Type
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Group / Ledger
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Normal Balance
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data.map((account) => (
              <tr
                key={account.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button")) return;
                  router.push(`/accounting/accounts/${account.id}`);
                }}
              >
                <td className="px-4 py-3 text-sm text-gray-900">
                  {account.name}
                  {account.parent_name && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({account.parent_name})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {account.number ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {account.root_type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {account.is_group ? "Group" : "Ledger"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {account.normal_balance ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.is_disabled
                        ? "bg-gray-100 text-gray-700"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {account.is_disabled ? "Disabled" : "Enabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {canWriteAccounting && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleDisabled(account);
                      }}
                      className="text-xs text-gray-700 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      {account.is_disabled ? "Enable" : "Disable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && data && data.data.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm text-gray-700">
          <span>
            Page {data.meta.current_page} of {data.meta.last_page}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.meta.last_page}
              onClick={() =>
                setPage((p) =>
                  data ? Math.min(data.meta.last_page, p + 1) : p + 1
                )
              }
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



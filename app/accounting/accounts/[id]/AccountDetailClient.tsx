"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountsApi } from "../../../lib/apiClient";
import type { Account } from "../../../lib/types";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editTaxRate, setEditTaxRate] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editDisabled, setEditDisabled] = useState(false);

  const canWriteAccounting = hasAtLeast("module.accounting", "read-write");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await accountsApi.getAccount(Number(id));
        if (!cancelled) {
          setAccount(res.account);
          setEditName(res.account.name);
          setEditNumber(res.account.number ?? "");
          setEditTaxRate(
            res.account.tax_rate != null ? String(res.account.tax_rate) : ""
          );
          setEditCurrency(res.account.currency ?? "");
          setEditDisabled(res.account.is_disabled);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load account.";
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!account || !canWriteAccounting) return;
    setSaving(true);
    try {
      const payload = {
        name: editName || account.name,
        number: editNumber || null,
        tax_rate: editTaxRate ? Number(editTaxRate) : null,
        currency: editCurrency || null,
        is_disabled: editDisabled,
      };
      const res = await accountsApi.updateAccount(account.id, payload);
      setAccount(res.account);
      setEditing(false);
      addToast("Account updated.", "success");
    } catch (e) {
      console.error(e);
      addToast("Failed to update account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const displayName = account
    ? `${account.number ?? ""} ${account.name}`.trim()
    : "Account";

  return (
    <div className="max-w-5xl mx-auto min-h-full">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Back"
          >
            <span className="text-sm text-gray-600">&larr;</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-900">
              {displayName}
            </h1>
            {account && (
              <p className="text-xs text-gray-500">
                {account.root_type} {account.is_group ? "group" : "ledger"}{" "}
                account
              </p>
            )}
          </div>
          {account && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                account.is_disabled
                  ? "bg-gray-100 text-gray-700"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {account.is_disabled ? "Disabled" : "Enabled"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canWriteAccounting && account && (
            <>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => router.push("/chart-of-accounts")}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Chart
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading && !account ? (
        <div className="text-sm text-gray-500">Loading account...</div>
      ) : account ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Account Name
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">{account.name}</div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Account Number
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">
                  {account.number ?? "—"}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Parent Account
              </div>
              <div className="mt-1 text-sm text-gray-900">
                {account.parent_name ?? "Top-level"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Root Type
              </div>
              <div className="mt-1 text-sm text-gray-900">
                {account.root_type}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Group / Ledger
              </div>
              <div className="mt-1 text-sm text-gray-900">
                {account.is_group ? "Group (can have children)" : "Ledger"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Normal Balance
              </div>
              <div className="mt-1 text-sm text-gray-900">
                {account.normal_balance ?? "Not applicable (group)"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tax Rate
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editTaxRate}
                  onChange={(e) => setEditTaxRate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">
                  {account.tax_rate != null ? `${account.tax_rate}%` : "—"}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Currency
              </div>
              {editing ? (
                <input
                  type="text"
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              ) : (
                <div className="mt-1 text-sm text-gray-900">
                  {account.currency ?? "Company default"}
                </div>
              )}
            </div>
            {editing && (
              <div className="flex items-center gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editDisabled}
                    onChange={(e) => setEditDisabled(e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span>Disable Account</span>
                </label>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}



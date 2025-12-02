"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { accountsApi } from "../../../lib/apiClient";
import type { Account } from "../../../lib/types";
import { useToast } from "../../../components/ui/ToastProvider";

export default function NewAccountPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    disabled: false,
    isGroup: false,
    accountName: "",
    parentAccount: "",
    accountNumber: "",
    accountType: "",
    taxRate: "",
    balanceMustBe: "",
  });
  const [parentOptions, setParentOptions] = useState<Account[]>([]);
  const [parentId, setParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    const loadParents = async () => {
      try {
        const res = await accountsApi.getAccounts({
          company_id: 1,
          is_group: true,
          per_page: 1000,
        });
        if (!cancelled) {
          setParentOptions(res.data);
        }
      } catch (e) {
        console.error("Failed to load parent accounts", e);
      }
    };
    loadParents();
    return () => {
      cancelled = true;
    };
  }, []);

  const parentAccountLabel = useMemo(() => {
    if (!parentId) return formData.parentAccount;
    const found = parentOptions.find((p) => p.id === parentId);
    return found ? `${found.number ?? ""} ${found.name}`.trim() : formData.parentAccount;
  }, [parentId, parentOptions, formData.parentAccount]);

  const handleChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;

      // If switching to group account, clear balance side since it doesn't apply
      if (field === "isGroup") {
        const isGroup = value as boolean;
        setFormData((prev) => ({
          ...prev,
          isGroup,
          balanceMustBe: isGroup ? "" : prev.balanceMustBe,
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const missingParentForLedger = !formData.isGroup && !parentId;

    if (!formData.accountName || !formData.accountType || missingParentForLedger) {
      const localErrors: Record<string, string[]> = {};
      if (!formData.accountName) localErrors.name = ["Account name is required."];
      if (!formData.accountType) localErrors.root_type = ["Account type is required."];
      if (missingParentForLedger) {
        localErrors.parent_id = ["Parent account is required for ledger accounts."];
      }
      setErrors(localErrors);
      return;
    }
    if (!formData.isGroup && !formData.balanceMustBe) {
      setErrors((prev) => ({
        ...prev,
        normal_balance: ["Balance side is required for ledger accounts."],
      }));
      return;
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof accountsApi.createAccount>[0] = {
        company_id: 1, // TODO: wire actual company
        name: formData.accountName,
        number: formData.accountNumber || null,
        parent_id: formData.isGroup ? parentId ?? null : parentId,
        root_type: formData.accountType.toLowerCase(),
        is_group: formData.isGroup,
        normal_balance: formData.isGroup
          ? null
          : (formData.balanceMustBe.toLowerCase() as "debit" | "credit"),
        tax_rate: formData.taxRate ? Number(formData.taxRate) : null,
        is_disabled: formData.disabled,
        currency: null,
      };

      await accountsApi.createAccount(payload);
      addToast("Account created successfully.", "success");
      router.push("/chart-of-accounts");
    } catch (e) {
      console.error(e);
      if (e && typeof e === "object" && "status" in e && (e as { status?: number }).status === 422) {
        const data = (e as { data?: { errors?: Record<string, string[]> } }).data;
        if (data?.errors) {
          setErrors(data.errors);
        }
      } else {
        addToast("Failed to create account.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">New Account</h1>
      </div>

      <form
        id="new-account-form"
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row 1: checkboxes aligned in grid */}
          <div className="flex items-center h-full">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.disabled}
                onChange={handleChange("disabled")}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span>Disable</span>
            </label>
          </div>
          <div className="flex items-center h-full">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.isGroup}
                onChange={handleChange("isGroup")}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span>Is Group</span>
            </label>
          </div>

          {/* Row 2: Account Name / Parent Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.accountName}
              onChange={handleChange("accountName")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Account <span className="text-red-500">*</span>
            </label>
            <input
              type="search"
              value={parentAccountLabel}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({ ...prev, parentAccount: value }));
                const match = parentOptions.find((p) => {
                  const label = `${p.number ?? ""} ${p.name}`.trim();
                  return label.toLowerCase() === value.toLowerCase();
                });
                setParentId(match ? match.id : null);
                if (match) {
                  // Ensure root type always matches selected parent
                  const parentRootType = match.root_type;
                  const capitalized =
                    parentRootType.charAt(0).toUpperCase() + parentRootType.slice(1);
                  setFormData((prev) => ({
                    ...prev,
                    accountType: capitalized,
                  }));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              placeholder="Search parent account"
              list="parent-account-options"
            />
            <datalist id="parent-account-options">
              {parentOptions.map((opt) => (
                <option
                  key={opt.id}
                  value={`${opt.number ?? ""} ${opt.name}`.trim()}
                />
              ))}
            </datalist>
            {errors.parent_id && (
              <p className="mt-1 text-xs text-red-600">{errors.parent_id[0]}</p>
            )}
          </div>

          {/* Row 3: Account Number / Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={handleChange("accountNumber")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {errors.number && (
              <p className="mt-1 text-xs text-red-600">{errors.number[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              value={formData.accountType}
              onChange={handleChange("accountType")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="">Select account type</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
            {errors.root_type && (
              <p className="mt-1 text-xs text-red-600">{errors.root_type[0]}</p>
            )}
            {parentId && (
              <p className="mt-1 text-xs text-gray-500">
                Type is derived from the parent account and must match it.
              </p>
            )}
          </div>

          {/* Row 4: Tax Rate / Balance must be (for ledgers only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Rate
            </label>
            <input
              type="text"
              value={formData.taxRate}
              onChange={handleChange("taxRate")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {errors.tax_rate && (
              <p className="mt-1 text-xs text-red-600">{errors.tax_rate[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Balance must be
            </label>
            <select
              value={formData.balanceMustBe}
              onChange={handleChange("balanceMustBe")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:text-gray-400"
              disabled={formData.isGroup}
            >
              <option value="">Select</option>
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Only ledger accounts (Is Group unchecked) should have a debit or credit balance.
            </p>
            {errors.normal_balance && !formData.isGroup && (
              <p className="mt-1 text-xs text-red-600">
                {errors.normal_balance[0]}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}



"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { staffApi, accountMappingsApi, accountsApi, ApiError } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";
import type { StaffMember } from "../../../lib/types";

export default function NewAdvancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const staffIdParam = searchParams.get("staff_id");
  
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({
    amount: "",
    transaction_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [checkingAccount, setCheckingAccount] = useState(false);

  useEffect(() => {
    const loadStaff = async () => {
      if (!staffIdParam) return;
      try {
        setLoading(true);
        const staffData = await staffApi.get(staffIdParam);
        setStaff(staffData);
      } catch (e) {
        console.error(e);
        addToast("Failed to load staff member", "error");
        router.push("/staff/members");
      } finally {
        setLoading(false);
      }
    };
    void loadStaff();
  }, [staffIdParam, router, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffIdParam || !staff) {
      addToast("Staff member not selected", "error");
      return;
    }
    
    if (!form.amount || Number(form.amount) <= 0) {
      addToast("Amount must be greater than 0", "error");
      return;
    }

    if (!form.transaction_date) {
      addToast("Transaction date is required", "error");
      return;
    }

    setLoading(true);
    setCheckingAccount(true);
    try {
      // Check if staff_advance account mapping is configured
      const mappingsResponse = await accountMappingsApi.getAccountMappings({
        mapping_type: 'staff_advance',
        company_id: 1,
      });
      
      const advanceMapping = mappingsResponse.data.find(m => m.mapping_type === 'staff_advance');
      
      if (!advanceMapping || !advanceMapping.account_id) {
        throw new Error("Staff advance account is not configured. Please configure it in Staff Settings.");
      }
      
      // Get the payment account balance (we'll use the same account as salary payment for simplicity)
      // In a real scenario, you might want a separate payment account for advances
      const salaryPaymentMapping = (await accountMappingsApi.getAccountMappings({
        mapping_type: 'staff_salary_payment',
        company_id: 1,
      })).data.find(m => m.mapping_type === 'staff_salary_payment');
      
      if (salaryPaymentMapping?.account_id) {
        const balanceResponse = await accountsApi.getAccountBalance(salaryPaymentMapping.account_id);
        const accountBalance = balanceResponse.balance;
        const advanceAmount = Number(form.amount);
        
        if (accountBalance < advanceAmount) {
          throw new Error(`Cannot give advance: Payment account has insufficient balance (PKR ${accountBalance.toLocaleString()}). Required: PKR ${advanceAmount.toLocaleString()}.`);
        }
      }
      
      setCheckingAccount(false);
      
      // Give advance using the API
      await staffApi.giveAdvance(Number(staffIdParam), {
        amount: Number(form.amount),
        transaction_date: form.transaction_date,
        notes: form.notes.trim() || null,
      });
      
      addToast("Advance given successfully", "success");
      router.push(`/staff/members/${staffIdParam}`);
    } catch (e) {
      console.error(e);
      setCheckingAccount(false);
      if (e instanceof ApiError) {
        addToast(e.message || "Failed to give advance", "error");
      } else {
        const errorMessage = e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to give advance. Please try again.";
        addToast(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!staffIdParam) {
    return (
      <div className="max-w-2xl mx-auto min-h-full px-2 md:px-0">
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          No staff member selected. Please select a staff member first.
        </div>
        <button
          onClick={() => router.push("/staff/members")}
          className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Go to Staff Members
        </button>
      </div>
    );
  }

  if (loading && !staff) {
    return (
      <div className="max-w-2xl mx-auto min-h-full px-2 md:px-0">
        <div className="text-sm text-gray-500">Loading staff member...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto min-h-full px-2 md:px-0">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Issue Advance
        </h1>
        <p className="text-sm text-gray-600">
          {staff ? `Issue advance to ${staff.full_name}` : "Issue advance to staff member"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {staff && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Staff Member</p>
            <p className="text-base text-gray-900">{staff.full_name}</p>
            {staff.designation && (
              <p className="text-sm text-gray-600">{staff.designation}</p>
            )}
            {staff.monthly_salary && (
              <p className="text-sm text-gray-600 mt-1">
                Monthly Salary: PKR {staff.monthly_salary.toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Advance Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="amount"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the advance amount in PKR
          </p>
        </div>

        <div>
          <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="transaction_date"
            required
            value={form.transaction_date}
            onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Optional notes about this advance"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || checkingAccount}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
          >
            {checkingAccount ? "Checking..." : loading ? "Giving Advance..." : "Give Advance"}
          </button>
        </div>
      </form>
    </div>
  );
}


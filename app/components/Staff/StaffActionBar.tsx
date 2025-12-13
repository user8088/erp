"use client";

import { Plus, RefreshCw, UserPlus, Wallet, HandCoins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "../../components/User/UserContext";

interface StaffActionBarProps {
  onRefresh?: () => void;
}

export default function StaffActionBar({ onRefresh }: StaffActionBarProps) {
  const router = useRouter();
  const { hasAtLeast } = useUser();
  
  const canManageStaff = hasAtLeast("module.staff", "read-write");
  const canManageUsers = hasAtLeast("staff.users.manage", "read-write");
  const canPaySalary = hasAtLeast("staff.salary.pay", "read-write");

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {canManageUsers && (
          <button
            type="button"
            onClick={() => router.push("/staff/users/new")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-800 rounded-md hover:bg-gray-50 transition-colors text-sm"
            title={!canManageUsers ? "You don't have permission to create ERP users" : ""}
          >
            <UserPlus className="w-4 h-4" />
            <span>Make ERP User</span>
          </button>
        )}
        {canManageStaff && (
          <>
            <button
              type="button"
              onClick={() => router.push("/staff/advance/new")}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-800 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              <HandCoins className="w-4 h-4" />
              <span>Give Advance</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/staff/members/new")}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </>
        )}
        {canPaySalary && (
          <button
            type="button"
            onClick={() => router.push("/staff/salary")}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
            title={!canPaySalary ? "You don't have permission to pay salaries" : ""}
          >
            <Wallet className="w-4 h-4" />
            <span>Pay Salary</span>
          </button>
        )}
      </div>
    </div>
  );
}


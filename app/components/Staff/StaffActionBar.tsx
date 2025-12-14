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
        {canManageStaff && (
          <>
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
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import StaffActionBar from "../../components/Staff/StaffActionBar";
import StaffFilterBar from "../../components/Staff/StaffFilterBar";
import StaffTable from "../../components/Staff/StaffTable";
import { useStaffList } from "../../components/Staff/useStaffList";

export default function StaffMembersPage() {
  const { staff, loading, error, reload } = useStaffList();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="max-w-full mx-auto min-h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Staff Members
        </h1>
        <p className="text-sm text-gray-600">
          Manage staff, map them to ERP users, and track salary readiness.
        </p>
      </div>

      <StaffActionBar
        onRefresh={async () => {
          setRefreshing(true);
          await reload();
          setRefreshing(false);
        }}
      />
      <StaffFilterBar />
      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}
      <StaffTable staff={staff} loading={loading || refreshing} />
    </div>
  );
}


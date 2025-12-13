"use client";

import { useState } from "react";
import StaffActionBar from "../../components/Staff/StaffActionBar";
import StaffFilterBar from "../../components/Staff/StaffFilterBar";
import StaffTable from "../../components/Staff/StaffTable";
import { useStaffList, type StaffFilters } from "../../components/Staff/useStaffList";
import { staffApi, ApiError } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import { useUser } from "../../components/User/UserContext";

export default function StaffMembersPage() {
  const { addToast } = useToast();
  const { hasAtLeast } = useUser();
  
  const canManageStaff = hasAtLeast("module.staff", "read-write");
  const canViewStaff = hasAtLeast("module.staff", "read");
  const [filters, setFilters] = useState<StaffFilters>({});
  const { staff, loading, error, reload } = useStaffList(filters);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

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

      {!canViewStaff && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          You don&apos;t have permission to view staff members.
        </div>
      )}
      
      {canViewStaff && (
        <>
          <StaffActionBar
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
          <StaffFilterBar filters={filters} onFiltersChange={setFilters} />
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          <StaffTable 
            staff={staff} 
            loading={loading || refreshing}
            onDelete={canManageStaff ? async (id: number) => {
              setDeletingIds(prev => new Set(prev).add(id));
              try {
                await staffApi.deleteStaff(id);
                addToast("Staff member deleted successfully", "success");
                await reload();
              } catch (e) {
                console.error("Failed to delete staff:", e);
                if (e instanceof ApiError) {
                  if (e.status === 404) {
                    addToast("Staff member not found", "error");
                  } else if (e.status === 403) {
                    addToast("You don&apos;t have permission to delete staff members", "error");
                  } else {
                    addToast(e.message || "Failed to delete staff member", "error");
                  }
                } else {
                  addToast("Failed to delete staff member. Please try again.", "error");
                }
              } finally {
                setDeletingIds(prev => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                });
              }
            } : async () => {
              addToast("You don't have permission to delete staff members", "error");
            }}
            deletingIds={deletingIds}
            canDelete={canManageStaff}
          />
        </>
      )}
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import StaffDetailHeader from "../../../components/StaffDetail/StaffDetailHeader";
import StaffDetailContent from "../../../components/StaffDetail/StaffDetailContent";
import StaffDetailSidebar from "../../../components/StaffDetail/StaffDetailSidebar";
import type {
  AttendanceEntry,
  StaffAdvance,
  StaffMember,
  StaffSalary,
  StaffSalaryRun,
} from "../../../lib/types";
import { staffApi, salaryRunsApi, attendanceApi, accountMappingsApi, accountsApi, ApiError } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";
import { DEFAULT_PAYABLE_DAYS } from "../../../lib/staffConstants";
import { useUser } from "@/app/components/User/UserContext";

interface StaffDetailClientProps {
  id: string;
}

export default function StaffDetailClient({ id }: StaffDetailClientProps) {
  const { addToast } = useToast();
  const { hasAtLeast } = useUser();
  const canPaySalary = hasAtLeast("staff.salary.pay", "read-write");
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [saving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [runs, setRuns] = useState<StaffSalaryRun[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<StaffSalary[]>([]);
  const [paying, setPaying] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, number> | null>(
    null
  );
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Advances backend not available yet; keep empty to avoid dummy rows.
  const advances: StaffAdvance[] = [];

  const currentMonthRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const start = `${year}-${month}-01`;
    const endDate = new Date(year, now.getMonth() + 1, 0).getDate();
    const end = `${year}-${month}-${String(endDate).padStart(2, "0")}`;
    return { start, end };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [staffRes, runList] = await Promise.all([
          staffApi.get(id),
          salaryRunsApi.list(id, { per_page: 20 }),
        ]);

        if (!cancelled) {
          setStaff(staffRes || null);
          setRuns(runList.data ?? []);
        }

        setAttendanceLoading(true);
        const attendanceRes = await attendanceApi.list({
          person_type: "staff",
          person_ids: [id],
          from: currentMonthRange.start,
          to: currentMonthRange.end,
          summary: true,
          per_page: 100,
        });
        if (!cancelled) {
          setAttendance(attendanceRes.data ?? []);
          setAttendanceSummary(attendanceRes.summary ?? null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load staff profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAttendanceLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, currentMonthRange]);

  useEffect(() => {
    if (!staff) return;
    const mapped: StaffSalary[] = runs.map((run) => ({
      id: run.id,
      staff_id: run.staff_id,
      month: run.month,
      status: run.status === "paid" ? "paid" : run.status === "due" ? "due" : "scheduled",
      amount: run.net_payable,
      due_date: run.due_date ?? "",
      paid_on: run.paid_on,
      invoice_number: run.invoice_number ?? undefined,
      advance_adjusted: run.advance_adjusted,
      notes: run.notes ?? undefined,
    }));
    setSalaryHistory(mapped);
  }, [runs, staff]);

  const handlePaySalary = async () => {
    if (!staff) return;
    setPaying(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      
      // Get the payment account mapping
      const mappingsResponse = await accountMappingsApi.getAccountMappings({
        mapping_type: 'staff_salary_payment',
        company_id: 1,
      });
      
      const paymentMapping = mappingsResponse.data.find(m => m.mapping_type === 'staff_salary_payment');
      
      if (!paymentMapping || !paymentMapping.account_id) {
        throw new Error("Salary payment account is not configured. Please configure it in Staff Settings.");
      }
      
      // Get the payment account balance
      const balanceResponse = await accountsApi.getAccountBalance(paymentMapping.account_id);
      const accountBalance = balanceResponse.balance;
      
      // Use monthly_salary as an estimate for balance check (actual amount may vary due to attendance/deductions)
      const estimatedSalaryAmount = staff.monthly_salary || 0;
      
      // Check if balance is sufficient (using estimate)
      if (accountBalance <= 0) {
        throw new Error(`Cannot pay salary: Payment account has insufficient balance (PKR ${accountBalance.toLocaleString()}). The account balance must be greater than 0.`);
      }
      
      if (estimatedSalaryAmount > 0 && accountBalance < estimatedSalaryAmount) {
        throw new Error(`Cannot pay salary: Payment account has insufficient balance (PKR ${accountBalance.toLocaleString()}). Estimated required: PKR ${estimatedSalaryAmount.toLocaleString()}.`);
      }
      
      // Pay salary directly using the new direct payment API
      await staffApi.paySalary(staff.id, {
        month,
        payable_days: staff.monthly_salary ? DEFAULT_PAYABLE_DAYS : undefined,
        advance_adjusted: 0,
        paid_on: new Date().toISOString().slice(0, 10),
      });
      
      addToast("Salary paid successfully.", "success");
      
      // Reload staff data immediately
      const updatedStaff = await staffApi.get(id);
      setStaff(updatedStaff || null);
      
      // Wait a brief moment for the backend to process, then fetch salary runs
      // Retry a few times in case the salary run isn't immediately available
      let updatedRuns = await salaryRunsApi.list(id, { per_page: 20 });
      let retries = 0;
      const maxRetries = 3;
      
      // Check if the payment month appears in the runs
      const hasPaymentMonth = updatedRuns.data?.some(run => run.month === month);
      
      // If not found, retry a few times with small delays
      while (!hasPaymentMonth && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        updatedRuns = await salaryRunsApi.list(id, { per_page: 20 });
        if (updatedRuns.data?.some(run => run.month === month)) {
          break;
        }
        retries++;
      }
      
      setRuns(updatedRuns.data ?? []);
    } catch (e) {
      console.error("Salary payment error:", e);
      
      // Handle 409 Conflict (already paid) - show the backend message directly
      if (e instanceof ApiError && e.status === 409) {
        // The ApiError.message already contains the backend message
        // e.g., "Salary already paid for 2025-12. Use reverse method to undo."
        addToast(e.message || "Salary is already paid for this month. Use reverse method to undo.", "error");
        return;
      }
      
      const errorMessage = e instanceof ApiError
        ? e.message
        : e && typeof e === "object" && "message" in e 
          ? String((e as { message: unknown }).message)
          : "Failed to pay salary. Check console for details.";
      addToast(errorMessage, "error");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading staff profile...</div>;
  }

  if (!staff && error) {
    return (
      <div className="max-w-full mx-auto min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Staff Profile</h2>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const staffRes = await staffApi.get(id);
                setStaff(staffRes || null);
              } catch (e) {
                console.error(e);
                setError(
                  e && typeof e === "object" && "message" in e
                    ? String((e as { message: unknown }).message)
                    : "Failed to load staff profile."
                );
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
        Staff not found.
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto min-h-full">
      <StaffDetailHeader
        staff={staff}
        saving={saving}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
      />
      <div className="flex gap-6 mt-4">
        {showSidebar && <StaffDetailSidebar />}
        <div className="flex-1 min-w-0 overflow-x-hidden">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          <StaffDetailContent
            staff={staff}
            salaryHistory={salaryHistory}
            advances={advances}
            attendanceEntries={attendance}
            attendanceSummary={attendanceSummary}
            attendanceLoading={attendanceLoading}
            onPaySalary={canPaySalary ? handlePaySalary : undefined}
            paying={paying}
            canPaySalary={canPaySalary}
          />
        </div>
      </div>
    </div>
  );
}


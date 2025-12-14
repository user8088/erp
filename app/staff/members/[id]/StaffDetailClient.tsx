"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import StaffDetailHeader from "../../../components/StaffDetail/StaffDetailHeader";
import StaffDetailContent from "../../../components/StaffDetail/StaffDetailContent";
import StaffDetailSidebar from "../../../components/StaffDetail/StaffDetailSidebar";
import AttendanceDeductionModal from "../../../components/StaffDetail/AttendanceDeductionModal";
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
  const [saving, setSaving] = useState(false);
  const [saveVersion, setSaveVersion] = useState(0);
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
  const [advances, setAdvances] = useState<StaffAdvance[]>([]);
  const [reversing, setReversing] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);

  const currentMonthRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const start = `${year}-${month}-01`;
    const endDate = new Date(year, now.getMonth() + 1, 0).getDate();
    const end = `${year}-${month}-${String(endDate).padStart(2, "0")}`;
    return { start, end };
  }, []);

  const loadAdvances = useCallback(async () => {
    try {
      const advancesRes = await staffApi.listAdvances(id, { per_page: 100 });
      setAdvances(advancesRes.data ?? []);
    } catch (e) {
      console.error("Failed to load advances:", e);
      setAdvances([]);
    }
  }, [id]);

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

        // Load advances
        if (!cancelled) {
          await loadAdvances();
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
  }, [id, currentMonthRange, loadAdvances]);

  // Reload advances when component becomes visible (e.g., returning from advance creation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && staff) {
        loadAdvances();
      }
    };
    
    const handleFocus = () => {
      if (staff) {
        loadAdvances();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [id, staff, loadAdvances]);

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
    
    // Show modal to adjust attendance deduction
    setShowDeductionModal(true);
  };

  const handleDeductionModalConfirm = async (month: string, manualAttendanceDeduction: number | null) => {
    if (!staff) return;
    
    setPaying(true);
    setShowDeductionModal(false);
    
    try {
      
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
      
      // Check if staff has advance balance
      const advanceBalance = staff.advance_balance || 0;
      const shouldDeductAdvances = advanceBalance > 0;
      
      // Pay salary directly using the new direct payment API
      await staffApi.paySalary(staff.id, {
        month,
        payable_days: staff.monthly_salary ? DEFAULT_PAYABLE_DAYS : undefined,
        manual_attendance_deduction: manualAttendanceDeduction ?? undefined,
        deduct_advances: shouldDeductAdvances, // Automatically deduct if advance balance exists
        paid_on: new Date().toISOString().slice(0, 10),
      });
      
      addToast("Salary paid successfully.", "success");
      
      // Notify the list page to refresh when user navigates back
      if (typeof window !== "undefined") {
        window.localStorage.setItem("staff-salary-paid", `${staff.id}-${Date.now()}`);
      }
      
      // Reload staff data with retry to ensure payment status is updated
      // Backend automatically updates last_paid_on, last_paid_month, and is_paid_for_current_month
      let staffRetries = 0;
      const maxStaffRetries = 5;
      let updatedStaff = await staffApi.get(id);
      
      // Retry if payment status fields are not yet updated (backend might need a moment)
      // Check for either last_paid_on or is_paid_for_current_month to confirm update
      while (
        !updatedStaff?.last_paid_on && 
        !updatedStaff?.is_paid_for_current_month && 
        !updatedStaff?.last_paid_month &&
        staffRetries < maxStaffRetries
      ) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait 300ms
        updatedStaff = await staffApi.get(id);
        if (updatedStaff?.last_paid_on || updatedStaff?.is_paid_for_current_month || updatedStaff?.last_paid_month) {
          break;
        }
        staffRetries++;
      }
      
      setStaff(updatedStaff || null);

      // Backend automatically calculates and updates next_pay_date (1 month after payment date)
      // No need to manually calculate or update it - it's already done by the backend
      
      // Wait a brief moment for the backend to process, then fetch salary runs
      // Retry a few times in case the salary run isn't immediately available
      let updatedRuns = await salaryRunsApi.list(id, { per_page: 20 });
      let runsRetries = 0;
      const maxRunsRetries = 3;
      
      // Check if the payment month appears in the runs
      const hasPaymentMonth = updatedRuns.data?.some(run => run.month === month);
      
      // If not found, retry a few times with small delays
      while (!hasPaymentMonth && runsRetries < maxRunsRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        updatedRuns = await salaryRunsApi.list(id, { per_page: 20 });
        if (updatedRuns.data?.some(run => run.month === month)) {
          break;
        }
        runsRetries++;
      }
      
      setRuns(updatedRuns.data ?? []);
      
      // Reload advances to see updated balance
      await loadAdvances();
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

  const handleReverseSalary = async () => {
    if (!staff) return;
    
    const lastPaidMonth = staff.last_paid_month;
    
    if (!lastPaidMonth) {
      addToast("No salary payment found to reverse.", "error");
      return;
    }

    if (!confirm(`Are you sure you want to reverse the salary payment for ${lastPaidMonth}? This will undo the payment and allow you to pay again with advance deduction.`)) {
      return;
    }

    setReversing(true);
    try {
      await staffApi.reverseSalary(staff.id, {
        month: lastPaidMonth,
        reason: "Reversing to test advance deduction",
      });

      addToast("Salary payment reversed successfully. You can now pay again with advance deduction.", "success");

      // Reload staff data
      const updatedStaff = await staffApi.get(id);
      setStaff(updatedStaff || null);

      // Reload salary runs
      const updatedRuns = await salaryRunsApi.list(id, { per_page: 20 });
      setRuns(updatedRuns.data ?? []);

      // Reload advances to see updated balance
      await loadAdvances();
    } catch (e) {
      console.error("Salary reversal error:", e);
      const errorMessage = e instanceof ApiError
        ? e.message
        : e && typeof e === "object" && "message" in e 
          ? String((e as { message: unknown }).message)
          : "Failed to reverse salary payment. Check console for details.";
      addToast(errorMessage, "error");
    } finally {
      setReversing(false);
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
        onSave={() => setSaveVersion((v) => v + 1)}
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
            reversing={reversing}
            onReverseSalary={canPaySalary ? handleReverseSalary : undefined}
            saveSignal={saveVersion}
            onStaffUpdated={(updatedStaff) => {
              if (updatedStaff && updatedStaff.id) {
                setStaff(updatedStaff);
              }
            }}
            onSavingChange={setSaving}
          />
        </div>
      </div>

      {/* Attendance Deduction Modal */}
      {staff && (
        <AttendanceDeductionModal
          isOpen={showDeductionModal}
          onClose={() => setShowDeductionModal(false)}
          onConfirm={handleDeductionModalConfirm}
          staff={staff}
          attendanceEntries={attendance}
          attendanceSummary={attendanceSummary}
          initialMonth={new Date().toISOString().slice(0, 7)}
          monthlySalary={staff.monthly_salary || 0}
          payableDays={DEFAULT_PAYABLE_DAYS}
        />
      )}
    </div>
  );
}

